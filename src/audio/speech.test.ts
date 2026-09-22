import { afterEach, describe, expect, it, vi } from "vitest";
import { Speaker, voiceForSpeech, voicesForSettings } from "./speech";

function voice(partial: {
  name: string;
  voiceURI: string;
  localService: boolean;
  default?: boolean;
}): SpeechSynthesisVoice {
  return partial as SpeechSynthesisVoice;
}

describe("voiceForSpeech", () => {
  const local = voice({ name: "Samantha", voiceURI: "samantha", localService: true });
  const localDefault = voice({ name: "Alex", voiceURI: "alex", localService: true, default: true });
  const remote = voice({ name: "Google US English", voiceURI: "google", localService: false, default: true });

  it("uses a saved built-in voice", () => {
    expect(voiceForSpeech([remote, local, localDefault], "samantha")?.voiceURI).toBe("samantha");
  });

  it("does not use a saved network voice when a built-in voice exists", () => {
    expect(voiceForSpeech([remote, local, localDefault], "google")?.voiceURI).toBe("alex");
    expect(voiceForSpeech([remote, local], "")?.voiceURI).toBe("samantha");
  });

  it("leaves the browser default only when no built-in voice exists", () => {
    expect(voiceForSpeech([remote], "google")).toBeNull();
    expect(voiceForSpeech([], "")).toBeNull();
  });
});

describe("Speaker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function install() {
    vi.useFakeTimers();
    const spoken: Array<{ text: string; onend: (() => void) | null; onerror: (() => void) | null }> = [];
    let cancels = 0;
    const delays: number[] = [];
    const order: string[] = [];
    const synth = {
      getVoices: (): SpeechSynthesisVoice[] => [],
      speak(utterance: { text: string; onend: (() => void) | null; onerror: (() => void) | null }) {
        spoken.push(utterance);
      },
      cancel() {
        cancels += 1;
        order.push("cancel");
        spoken[spoken.length - 1]?.onerror?.();
      },
    };
    class Utterance {
      volume = 1;
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("window", {
      speechSynthesis: synth,
      setTimeout: ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        delays.push(timeout ?? 0);
        return globalThis.setTimeout(handler, timeout, ...args);
      }) as typeof setTimeout,
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
    return { spoken, delays, speaker: new Speaker(), cancels: () => cancels, order };
  }

  const options = { volume: 1, rate: 1, voiceURI: "" };

  it("resolves an utterance when another speak interrupts it", async () => {
    const { speaker, spoken } = install();
    let done = false;
    const first = speaker.speakText("hello there", options);
    void first.then(() => {
      done = true;
    });
    expect(spoken).toHaveLength(1);
    const second = speaker.speakText("say it again", options);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(spoken).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(50);
    expect(spoken).toHaveLength(2);
    speaker.stop();
    await second;
  });

  it("cancels the utterance when the watchdog fires", async () => {
    const { speaker, delays, order } = install();
    const phrase = "a".repeat(100);
    const pending = speaker.speakText(phrase, options);
    void pending.then(() => {
      order.push("done");
    });
    expect(delays[0]).toBe(phrase.length * 90);
    await vi.advanceTimersByTimeAsync(phrase.length * 90);
    expect(order.at(-1)).toBe("done");
    expect(order.lastIndexOf("cancel")).toBeLessThan(order.lastIndexOf("done"));
  });

  it("lengthens the watchdog when speech is slower", () => {
    const { speaker, delays } = install();
    const phrase = "a".repeat(100);
    void speaker.speakText(phrase, { ...options, rate: 0.5 });
    expect(delays[0]).toBe(15000);
    speaker.stop();
  });

  it("keeps a gap after a speak that the watchdog already finished", async () => {
    const { speaker, spoken } = install();
    const phrase = "a".repeat(100);
    const first = speaker.speakText(phrase, options);
    await vi.advanceTimersByTimeAsync(phrase.length * 90);
    await first;
    const before = spoken.length;
    const second = speaker.speakText("hello again", options);
    expect(spoken).toHaveLength(before);
    await vi.advanceTimersByTimeAsync(49);
    expect(spoken).toHaveLength(before);
    await vi.advanceTimersByTimeAsync(1);
    expect(spoken).toHaveLength(before + 1);
    speaker.stop();
    await second;
  });
});

describe("voicesForSettings", () => {
  it("lists only built-in voices when any exist", () => {
    const listed = voicesForSettings([
      voice({ name: "Google UK", voiceURI: "google-uk", localService: false }),
      voice({ name: "Samantha", voiceURI: "samantha", localService: true }),
      voice({ name: "Alex", voiceURI: "alex", localService: true }),
    ]);
    expect(listed.map((item) => item.voiceURI)).toEqual(["alex", "samantha"]);
  });

  it("lists network voices when the device has no built-in voice", () => {
    const listed = voicesForSettings([
      voice({ name: "Google UK", voiceURI: "google-uk", localService: false }),
      voice({ name: "Google US", voiceURI: "google-us", localService: false }),
    ]);
    expect(listed.map((item) => item.name)).toEqual(["Google UK", "Google US"]);
  });
});
