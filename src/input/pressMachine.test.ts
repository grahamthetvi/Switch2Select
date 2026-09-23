import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types";
import {
  type ChoiceConfig,
  type PressConfig,
  choiceConfigFrom,
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
  offerScanMs: 0,
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

  it("a paused picture can finish appearing and then be spoken", () => {
    let state = reducePress(initialPressState(3), { type: "pause" }, config);
    state = reducePress(state, { type: "pressIn" }, config);
    expect(state.phase).toBe("rotating");
    state = reducePress(state, { type: "tick", dt: config.appearDwellMs }, config);
    expect(state.visibleMs).toBe(config.appearDwellMs);
    expect(state.index).toBe(0);
    state = reducePress(state, { type: "tick", dt: config.rotationMs }, config);
    expect(state.index).toBe(0);
    expect(state.phase).toBe("rotating");
    state = reducePress(state, { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.previewHoldMs }, config);
    state = reducePress(state, { type: "pressCommit" }, config);
    expect(state.phase).toBe("speaking");
    expect(state.speech).toBe("utterance");
    expect(state.paused).toBe(true);
  });

  it("paused rotation does not advance", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "tick", dt: config.rotationMs * 3 }, config);
    expect(state.paused).toBe(true);
    expect(state.phase).toBe("rotating");
    expect(state.index).toBe(0);
    expect(state.visibleMs).toBe(config.appearDwellMs);
  });

  it("a light press then a deep press speaks the frozen picture", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "pressIn" }, config);
    state = reducePress(state, { type: "tick", dt: config.previewHoldMs }, config);
    expect(state.phase).toBe("latched");
    expect(state.paused).toBe(true);
    expect(state.index).toBe(0);
    state = reducePress(state, { type: "tick", dt: config.latchTimeoutMs }, config);
    expect(state.phase).toBe("latched");
    state = reducePress(state, { type: "pressCommit" }, config);
    expect(state.phase).toBe("speaking");
    expect(state.speech).toBe("utterance");
    expect(state.paused).toBe(true);
    expect(state.index).toBe(0);
  });

  it("does not run the post-speak clock while paused", () => {
    const auto = { ...config, autoResumeAfterSpeak: true };
    let state = reducePress(ready(), { type: "pressIn" }, auto);
    state = reducePress(state, { type: "tick", dt: auto.previewHoldMs }, auto);
    state = reducePress(state, { type: "pressCommit" }, auto);
    state = reducePress(state, { type: "speechDone" }, auto);
    state = reducePress(state, { type: "pause" }, auto);
    state = reducePress(state, { type: "tick", dt: auto.speakHoldMs }, auto);
    expect(state.phase).toBe("holding");
    expect(state.index).toBe(0);
    expect(state.paused).toBe(true);
  });

  it("cancel undoes the press and stays paused", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "pressIn" }, config);
    state = reducePress(state, { type: "cancel" }, config);
    expect(state.phase).toBe("rotating");
    expect(state.paused).toBe(true);
    expect(state.speech).toBe("stop");
    expect(state.index).toBe(0);
    expect(state.confirm).toBe(false);
  });

  it("escape while rotating and paused does not resume", () => {
    let state = reducePress(ready(), { type: "pause" }, config);
    state = reducePress(state, { type: "cancel" }, config);
    expect(state.paused).toBe(true);
    expect(state.phase).toBe("rotating");
    expect(state.index).toBe(0);
    expect(state.speech).toBeNull();
  });

  it("a ready pointer commit speaks before latchMs catches slow frames", () => {
    const latched = reducePress(ready(), { type: "pressIn" }, config);
    const early = reducePress(latched, { type: "tick", dt: 1 }, config);
    const bounced = reducePress(early, { type: "pressCommit" }, config);
    expect(bounced.phase).toBe("latched");
    expect(bounced.speech).not.toBe("utterance");
    const committed = reducePress(early, { type: "pressCommit", ready: true }, config);
    expect(committed.phase).toBe("speaking");
    expect(committed.speech).toBe("utterance");
  });

  it("ready does not skip the latch", () => {
    const next = reducePress(ready(), { type: "pressCommit", ready: true }, config);
    expect(next.phase).toBe("rotating");
    expect(next.speech).toBeNull();
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

  it("one-switch scanning moves the offer after the scan time", () => {
    const scanning = { ...choiceConfig, offerScanMs: 6000 };
    const ready = reduceChoice(initialChoiceState(), { type: "tick", dt: scanning.appearDwellMs }, scanning);
    const next = reduceChoice(ready, { type: "tick", dt: scanning.offerScanMs - scanning.appearDwellMs }, scanning);
    expect(next.offer).toBe(1);
    expect(next.visibleMs).toBe(0);
    expect(next.phase).toBe("idle");
  });

  it("one-switch scanning does not move a latched offer", () => {
    const scanning = { ...choiceConfig, offerScanMs: 6000 };
    let state = reduceChoice(shown(), { type: "pressIn" }, scanning);
    state = reduceChoice(state, { type: "tick", dt: scanning.offerScanMs }, scanning);
    expect(state.phase).toBe("latched");
    expect(state.offer).toBe(0);
  });

  it("one-switch scanning waits while paused", () => {
    const scanning = { ...choiceConfig, offerScanMs: 6000 };
    let state = reduceChoice(shown(), { type: "pause" }, scanning);
    state = reduceChoice(state, { type: "tick", dt: scanning.offerScanMs * 2 }, scanning);
    expect(state.offer).toBe(0);
    expect(state.phase).toBe("idle");
    expect(state.paused).toBe(true);
  });

  it("choiceConfigFrom scans only with one switch", () => {
    expect(choiceConfigFrom(defaultSettings).offerScanMs).toBe(0);
    expect(choiceConfigFrom({ ...defaultSettings, oneSwitch: true }).offerScanMs).toBe(defaultSettings.rotationMs);
  });

  it("previous and next move the offer and leave it there", () => {
    const next = reduceChoice(shown(), { type: "next" }, choiceConfig);
    expect(next.offer).toBe(1);
    const later = reduceChoice(next, { type: "tick", dt: 12000 }, choiceConfig);
    expect(later.offer).toBe(1);
    const prev = reduceChoice(later, { type: "prev" }, choiceConfig);
    expect(prev.offer).toBe(0);
  });

  it("pause lets the pair finish appearing without moving the offer", () => {
    let state = reduceChoice(initialChoiceState(), { type: "pause" }, choiceConfig);
    state = reduceChoice(state, { type: "pressIn" }, choiceConfig);
    expect(state.phase).toBe("idle");
    state = reduceChoice(state, { type: "tick", dt: choiceConfig.appearDwellMs + 4000 }, choiceConfig);
    expect(state.visibleMs).toBe(choiceConfig.appearDwellMs);
    expect(state.offer).toBe(0);
    state = reduceChoice(state, { type: "pressIn", side: 1 }, choiceConfig);
    expect(state.phase).toBe("latched");
    expect(state.side).toBe(1);
    expect(state.paused).toBe(true);
  });

  it("speaks a paused picture after the preview hold without moving the offer", () => {
    let state = reduceChoice(shown(), { type: "pause" }, choiceConfig);
    state = reduceChoice(state, { type: "pressIn", side: 1 }, choiceConfig);
    state = reduceChoice(state, { type: "tick", dt: choiceConfig.previewHoldMs }, choiceConfig);
    expect(state.offer).toBe(1);
    expect(state.visibleMs).toBe(choiceConfig.appearDwellMs);
    state = reduceChoice(state, { type: "pressCommit", effect: "speak" }, choiceConfig);
    expect(state.phase).toBe("speaking");
    expect(state.speech).toBe("utterance");
    expect(state.paused).toBe(true);
    expect(state.side).toBe(1);
  });

  it("cancel while paused stays paused", () => {
    let state = reduceChoice(shown(), { type: "pause" }, choiceConfig);
    state = reduceChoice(state, { type: "cancel" }, choiceConfig);
    expect(state.paused).toBe(true);
    expect(state.phase).toBe("idle");
    state = reduceChoice(state, { type: "pressIn" }, choiceConfig);
    state = reduceChoice(state, { type: "cancel" }, choiceConfig);
    expect(state.paused).toBe(true);
    expect(state.phase).toBe("idle");
    expect(state.speech).toBe("stop");
    expect(state.side).toBeNull();
  });

  it("ignores a pointer commit after the latched side changes", () => {
    let state = reduceChoice(shown(), { type: "pressIn", side: 0 }, choiceConfig);
    state = reduceChoice(state, { type: "pressIn", side: 1 }, choiceConfig);
    const stale = reduceChoice(state, {
      type: "pressCommit",
      effect: "open",
      side: 0,
      ready: true,
    }, choiceConfig);
    expect(stale.phase).toBe("latched");
    expect(stale.side).toBe(1);
    expect(stale.nav).toBeNull();
    const current = reduceChoice(stale, {
      type: "pressCommit",
      effect: "speak",
      side: 1,
      ready: true,
    }, choiceConfig);
    expect(current.phase).toBe("speaking");
    expect(current.side).toBe(1);
    expect(current.speech).toBe("utterance");
  });
});
