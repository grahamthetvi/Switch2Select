import { describe, expect, it } from "vitest";
import { voiceForSpeech, voicesForSettings } from "./speech";

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
