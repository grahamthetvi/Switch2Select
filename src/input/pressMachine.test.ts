import { describe, expect, it } from "vitest";
import {
  type ChoiceConfig,
  type PressConfig,
  initialChoiceState,
  initialPressState,
  reduceChoice,
  reducePress,
} from "./pressMachine";

const config: PressConfig = {
  rotationMs: 6000,
  appearDwellMs: 500,
  previewHoldMs: 250,
  latchTimeoutMs: 20000,
  speakHoldMs: 5000,
  autoResumeAfterSpeak: false,
  previewAudio: true,
};

const choiceConfig: ChoiceConfig = {
  appearDwellMs: 500,
  previewHoldMs: 250,
  latchTimeoutMs: 20000,
  speakHoldMs: 4000,
  autoResumeAfterSpeak: false,
  previewAudio: true,
};

function ready() {
  return reducePress(initialPressState(3), { type: "tick", dt: config.appearDwellMs }, config);
}

describe("rotating single target", () => {
  it("ignores a light press during the appear dwell and does not speak", () => {
    const early = reducePress(initialPressState(3), { type: "tick", dt: config.appearDwellMs - 1 }, config);
    const next = reducePress(early, { type: "pressIn" }, config);
    expect(next.phase).toBe("rotating");
    expect(next.speech).toBeNull();
  });

  it("light press latches and previews without the full utterance", () => {
    const next = reducePress(ready(), { type: "pressIn" }, config);
    expect(next.phase).toBe("latched");
    expect(next.speech).toBe("preview");
    expect(next.speech).not.toBe("utterance");
    expect(next.index).toBe(0);
  });

  it("skips preview audio when that setting is off", () => {
    const next = reducePress(ready(), { type: "pressIn" }, { ...config, previewAudio: false });
    expect(next.phase).toBe("latched");
    expect(next.speech).toBeNull();
  });

  it("ignores a deep press until the preview hold has passed", () => {
    const latched = reducePress(ready(), { type: "pressIn" }, config);
    const bounced = reducePress(latched, { type: "tick", dt: config.previewHoldMs - 1 }, config);
    const next = reducePress(bounced, { type: "pressCommit" }, config);
    expect(next.phase).toBe("latched");
    expect(next.speech).not.toBe("utterance");
  });

  it("deep press speaks the full utterance and confirms", () => {
    let state = reducePress(ready(), { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.previewHoldMs }, config);
    state = reducePress(state, { type: "pressCommit" }, config);
    expect(state.phase).toBe("speaking");
    expect(state.speech).toBe("utterance");
    expect(state.confirm).toBe(true);
  });

  it("does not accept a deep press before a light press", () => {
    const next = reducePress(ready(), { type: "pressCommit" }, config);
    expect(next.phase).toBe("rotating");
    expect(next.speech).toBeNull();
  });

  it("cancel is a silent undo", () => {
    let state = reducePress(ready(), { type: "pressIn" }, config);
    state = reducePress(state, { type: "cancel" }, config);
    expect(state.phase).toBe("rotating");
    expect(state.speech).toBe("stop");
    expect(state.index).toBe(0);
    expect(state.confirm).toBe(false);
  });

  it("advances one picture when the interval elapses", () => {
    const next = reducePress(ready(), { type: "tick", dt: config.rotationMs }, config);
    expect(next.index).toBe(1);
    expect(next.phase).toBe("rotating");
    expect(next.visibleMs).toBe(0);
  });

  it("pause freezes the current picture", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "tick", dt: config.rotationMs * 3 }, config);
    expect(state.paused).toBe(true);
    expect(state.index).toBe(0);
    expect(state.visibleMs).toBe(config.appearDwellMs);
  });

  it("resume continues from the same picture", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "resume" }, config);
    expect(state.paused).toBe(false);
    expect(state.index).toBe(0);
    expect(state.phase).toBe("rotating");
  });

  it("a light press still works while paused, after the dwell", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "pressIn" }, config);
    expect(state.phase).toBe("latched");
    expect(state.paused).toBe(true);
    expect(state.speech).toBe("preview");
  });

  it("latch timeout returns to the same picture without speaking", () => {
    let state = reducePress(ready(), { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.latchTimeoutMs }, config);
    expect(state.phase).toBe("rotating");
    expect(state.index).toBe(0);
    expect(state.speech).toBe("stop");
  });

  it("does not auto-resume after speech unless asked", () => {
    let state = reducePress(ready(), { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.previewHoldMs }, config);
    state = reducePress(state, { type: "pressCommit" }, config);
    state = reducePress(state, { type: "speechDone" }, config);
    state = reducePress(state, { type: "tick", dt: config.speakHoldMs + 1000 }, config);
    expect(state.phase).toBe("holding");
    expect(state.index).toBe(0);
  });

  it("auto-resume advances after the conversational hold", () => {
    const auto = { ...config, autoResumeAfterSpeak: true };
    let state = reducePress(ready(), { type: "pressIn" }, auto);
    state = reducePress(state, { type: "tick", dt: auto.previewHoldMs }, auto);
    state = reducePress(state, { type: "pressCommit" }, auto);
    state = reducePress(state, { type: "speechDone" }, auto);
    state = reducePress(state, { type: "tick", dt: auto.speakHoldMs }, auto);
    expect(state.phase).toBe("rotating");
    expect(state.index).toBe(1);
  });

  it("ignores another light press while speaking", () => {
    let state = reducePress(ready(), { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.previewHoldMs }, config);
    state = reducePress(state, { type: "pressCommit" }, config);
    const during = reducePress(state, { type: "pressIn" }, config);
    expect(during.phase).toBe("speaking");
    expect(during.speechSeq).toBe(state.speechSeq);
  });
});

describe("two-choice", () => {
  function shown() {
    return reduceChoice(initialChoiceState(), { type: "tick", dt: choiceConfig.appearDwellMs }, choiceConfig);
  }

  it("latches only the offered side and previews", () => {
    const next = reduceChoice(shown(), { type: "pressIn" }, choiceConfig);
    expect(next.phase).toBe("latched");
    expect(next.side).toBe(0);
    expect(next.speech).toBe("preview");
  });

  it("a pointer can latch the other side", () => {
    const next = reduceChoice(shown(), { type: "pressIn", side: 1 }, choiceConfig);
    expect(next.side).toBe(1);
    expect(next.offer).toBe(1);
  });

  it("deep press on a leaf speaks and does not open a third choice", () => {
    let state = reduceChoice(shown(), { type: "pressIn", side: 1 }, choiceConfig);
    state = reduceChoice(state, { type: "tick", dt: choiceConfig.previewHoldMs }, choiceConfig);
    state = reduceChoice(state, { type: "pressCommit", effect: "speak" }, choiceConfig);
    expect(state.phase).toBe("speaking");
    expect(state.speech).toBe("utterance");
    expect(state.nav).toBeNull();
    expect(state.side).toBe(1);
  });

  it("deep press on a branch opens that pair", () => {
    let state = reduceChoice(shown(), { type: "pressIn" }, choiceConfig);
    state = reduceChoice(state, { type: "tick", dt: choiceConfig.previewHoldMs }, choiceConfig);
    state = reduceChoice(state, { type: "pressCommit", effect: "open" }, choiceConfig);
    expect(state.nav).toBe("into");
    expect(state.speech).toBe("stop");
    expect(state.phase).toBe("idle");
    expect(state.side).toBe(0);
  });

  it("back does not speak", () => {
    const state = reduceChoice(shown(), { type: "back" }, choiceConfig);
    expect(state.nav).toBe("back");
    expect(state.speech).toBeNull();
  });

  it("does not advance the offer as time passes", () => {
    const state = reduceChoice(shown(), { type: "tick", dt: 12000 }, choiceConfig);
    expect(state.offer).toBe(0);
    expect(state.phase).toBe("idle");
  });

  it("previous and next move the offer and leave it there", () => {
    const next = reduceChoice(shown(), { type: "next" }, choiceConfig);
    expect(next.offer).toBe(1);
    const later = reduceChoice(next, { type: "tick", dt: 12000 }, choiceConfig);
    expect(later.offer).toBe(1);
    const prev = reduceChoice(later, { type: "prev" }, choiceConfig);
    expect(prev.offer).toBe(0);
  });
});
