export interface SpeakOptions {
  volume: number;
  rate: number;
  voiceURI: string;
}

export class Speaker {
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private speaking = false;

  stop(): void {
    this.token += 1;
    this.hardStop();
  }

  speakText(text: string, options: SpeakOptions): Promise<void> {
    const token = ++this.token;
    const interrupt = this.speaking || this.audio !== null;
    this.hardStop();
    const phrase = text.trim();
    if (!phrase || typeof window === "undefined" || !window.speechSynthesis) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = () => {
        if (token !== this.token) return;
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.volume = clampUnit(options.volume);
        utterance.rate = options.rate;
        const voice = window.speechSynthesis
          .getVoices()
          .find((item) => item.voiceURI === options.voiceURI);
        if (voice) utterance.voice = voice;
        const estimate = Math.min(15000, Math.max(2500, phrase.length * 90));
        const timer = window.setTimeout(() => finish(), estimate);
        const finish = () => {
          window.clearTimeout(timer);
          this.speaking = false;
          if (token === this.token) resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        this.speaking = true;
        window.speechSynthesis.speak(utterance);
      };
      if (interrupt) window.setTimeout(start, 50);
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
      const finish = () => {
        if (this.audioUrl === url) {
          URL.revokeObjectURL(url);
          this.audioUrl = null;
        }
        if (this.audio === audio) this.audio = null;
        if (token === this.token) resolve();
      };
      const timer = window.setTimeout(finish, 30000);
      audio.onended = () => {
        window.clearTimeout(timer);
        finish();
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        finish();
      };
      void audio.play().catch(() => {
        window.clearTimeout(timer);
        finish();
      });
    });
  }

  private hardStop(): void {
    this.speaking = false;
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
  }
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function listenForVoices(onChange: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) return () => undefined;
  const update = () => onChange(window.speechSynthesis.getVoices());
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
}
