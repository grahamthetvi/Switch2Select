export interface SpeakOptions {
  volume: number;
  rate: number;
  voiceURI: string;
}

export class Speaker {
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private utteranceArmed = false;
  private releaseCurrent: (() => void) | null = null;

  stop(): void {
    this.token += 1;
    this.hardStop();
  }

  speakText(text: string, options: SpeakOptions): Promise<void> {
    const token = ++this.token;
    const gap = this.utteranceArmed || this.audio !== null;
    this.hardStop();
    const phrase = text.trim();
    if (!phrase || typeof window === "undefined" || !window.speechSynthesis) {
      return Promise.resolve();
    }
    const rate = Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1;
    const estimate = Math.min(15000, Math.max(2500, (phrase.length * 90) / rate));
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (this.releaseCurrent === settle) this.releaseCurrent = null;
        resolve();
      };
      this.releaseCurrent = settle;
      const start = () => {
        if (settled || token !== this.token || !window.speechSynthesis) {
          settle();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.volume = clampUnit(options.volume);
        utterance.rate = options.rate;
        const voice = voiceForSpeech(window.speechSynthesis.getVoices(), options.voiceURI);
        if (voice) utterance.voice = voice;
        const finish = () => settle();
        timer = window.setTimeout(() => {
          if (token === this.token) window.speechSynthesis.cancel();
          finish();
        }, estimate);
        utterance.onend = finish;
        utterance.onerror = finish;
        this.utteranceArmed = true;
        window.speechSynthesis.speak(utterance);
      };
      if (gap) window.setTimeout(start, 50);
      else start();
    });
  }

  speakBlob(blob: Blob, volume: number): Promise<void> {
    const token = ++this.token;
    this.hardStop();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = clampUnit(volume);
    this.audio = audio;
    this.audioUrl = url;
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const settle = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (this.audioUrl === url) {
          URL.revokeObjectURL(url);
          this.audioUrl = null;
        }
        if (this.audio === audio) this.audio = null;
        if (this.releaseCurrent === settle) this.releaseCurrent = null;
        resolve();
      };
      this.releaseCurrent = settle;
      const finish = () => settle();
      timer = window.setTimeout(() => {
        if (token === this.token) {
          audio.pause();
          audio.src = "";
        }
        finish();
      }, 30000);
      audio.onended = finish;
      audio.onerror = finish;
      void audio.play().catch(finish);
    });
  }

  private hardStop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    const release = this.releaseCurrent;
    this.releaseCurrent = null;
    release?.();
  }
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function isLocalVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.localService === true;
}

/** Built-in voices only, when the device has any. Otherwise the full list. */
export function voicesForSettings(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const local = voices.filter(isLocalVoice);
  const shown = local.length > 0 ? local : voices.slice();
  return shown.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Never assign a network voice. Use the saved built-in voice, or another
 * built-in voice. Return null (the browser default) only when none exist.
 */
export function voiceForSpeech(voices: SpeechSynthesisVoice[], voiceURI: string): SpeechSynthesisVoice | null {
  const local = voices.filter(isLocalVoice);
  if (local.length === 0) return null;
  const requested = local.find((voice) => voice.voiceURI === voiceURI);
  if (requested) return requested;
  return local.find((voice) => voice.default) ?? local[0];
}

export function listenForVoices(onChange: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  const update = () => onChange(window.speechSynthesis.getVoices());
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}
