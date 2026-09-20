import type { SupportedLanguage } from './i18n';

export interface AnnouncementProvider {
  speak(text: string, lang: SupportedLanguage): Promise<void>;
  cancel(): void;
}

/**
 * Browser Speech Synthesis provider
 */
export class WebSpeechProvider implements AnnouncementProvider {
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  cancel(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  async speak(text: string, lang: SupportedLanguage): Promise<void> {
    if (!this.synth) return;

    return new Promise((resolve) => {
      this.synth!.cancel(); // stop any running speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // calm, clear pacing
      utterance.pitch = 1.0;

      // Map language codes to BCP 47
      const langMap: Record<SupportedLanguage, string> = {
        en: 'en-IN',
        ta: 'ta-IN',
        hi: 'hi-IN',
      };
      utterance.lang = langMap[lang] || 'en-IN';

      // Pick preferred regional voice if available
      const voices = this.synth!.getVoices();
      const targetPrefix = langMap[lang].split('-')[0];
      const matchingVoice =
        voices.find((v) => v.lang === langMap[lang]) ||
        voices.find((v) => v.lang.startsWith(targetPrefix)) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null;

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // gracefully complete on error

      this.synth!.speak(utterance);
    });
  }
}

/**
 * Stub Bhashini Provider (Section 2.5: future upgrade; throws not implemented)
 */
export class BhashiniProvider implements AnnouncementProvider {
  async speak(_text: string, _lang: SupportedLanguage): Promise<void> {
    throw new Error('BhashiniProvider is not implemented. Future Indian-language neural TTS provider.');
  }

  cancel(): void {
    // no-op
  }
}

/**
 * Play a two-tone gentle chime generated purely in Web Audio API code (no audio files)
 * First tone: 587.33 Hz (D5) -> Second tone: 880.00 Hz (A5)
 */
export function playChime(volume: number = 0.8): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return resolve();

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.connect(ctx.destination);

      // Smooth attack and decay envelope
      const vol = Math.max(0.1, Math.min(1.0, volume));
      gainNode.gain.linearRampToValueAtTime(vol * 0.25, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      // First tone (587.33Hz) for 0.35s, then step to (880Hz)
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880.0, now + 0.35);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.0);

      osc.onended = () => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

/**
 * Format token string for speech announcement:
 * e.g. "CARD-015" -> "C A R D, zero one five" (or equivalent in ta/hi)
 */
export function formatTokenForSpeech(token: string, lang: SupportedLanguage = 'en'): string {
  const parts = token.split('-');
  const prefix = parts[0] || '';
  const numStr = parts[1] || '';

  // Spell out letters with spaces: "C A R D"
  const spelledLetters = prefix.split('').join(' ');

  // English digit names
  const digitNamesEn: Record<string, string> = {
    '0': 'zero',
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
  };

  // Tamil digit names
  const digitNamesTa: Record<string, string> = {
    '0': 'பூஜ்ஜியம்',
    '1': 'ஒன்று',
    '2': 'இரண்டு',
    '3': 'மூன்று',
    '4': 'நான்கு',
    '5': 'ஐந்து',
    '6': 'ஆறு',
    '7': 'ஏழு',
    '8': 'எட்டு',
    '9': 'ஒன்பது',
  };

  // Hindi digit names
  const digitNamesHi: Record<string, string> = {
    '0': 'शून्य',
    '1': 'एक',
    '2': 'दो',
    '3': 'तीन',
    '4': 'चार',
    '5': 'पांच',
    '6': 'छह',
    '7': 'सात',
    '8': 'आठ',
    '9': 'नौ',
  };

  const map = lang === 'ta' ? digitNamesTa : lang === 'hi' ? digitNamesHi : digitNamesEn;
  const spelledDigits = numStr
    .split('')
    .map((d) => map[d] || d)
    .join(' ');

  return `${spelledLetters}, ${spelledDigits}`;
}

export interface AnnouncementItem {
  id: string;
  token: string;
  room: string;
  doctorName?: string;
  callCount: number;
  timestamp: string;
}

export interface QueuedAnnouncement {
  event: any;
  item: AnnouncementItem;
  isSecondCall: boolean;
  text: string;
}

/**
 * Announcement Queue manager (FIFO, max 5 waiting items, drops oldest if exceeded)
 */
export class AnnouncementQueue {
  private queue: (AnnouncementItem & { _originalEvent?: any })[] = [];
  private isProcessing = false;
  private provider: AnnouncementProvider;
  private soundEnabled: boolean = true;
  private volume: number = 0.8;
  private language: SupportedLanguage = 'en';
  private maxCapacity: number = 5;

  constructor(
    capacityOrProvider: number | AnnouncementProvider = 5,
    provider?: AnnouncementProvider
  ) {
    if (typeof capacityOrProvider === 'number') {
      this.maxCapacity = capacityOrProvider;
      this.provider = provider || new WebSpeechProvider();
    } else {
      this.provider = capacityOrProvider;
      this.maxCapacity = 5;
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setVolume(vol: number) {
    this.volume = vol;
  }

  setLanguage(lang: SupportedLanguage) {
    this.language = lang;
  }

  size(): number {
    return this.queue.length;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isBusy(): boolean {
    return this.isProcessing;
  }

  peek(): QueuedAnnouncement | undefined {
    if (this.queue.length === 0) return undefined;
    const item = this.queue[0];
    const isSecondCall = item.callCount > 1;
    const spokenToken = formatTokenForSpeech(item.token, this.language);
    const text = isSecondCall
      ? `Second call. Token ${spokenToken}. Please proceed to ${item.room}.`
      : `Token ${spokenToken}. Please proceed to ${item.room}.`;
    return {
      event: item._originalEvent || item,
      item,
      isSecondCall,
      text,
    };
  }

  dequeue(): QueuedAnnouncement | undefined {
    if (this.queue.length === 0) return undefined;
    const item = this.queue.shift()!;
    const isSecondCall = item.callCount > 1;
    const spokenToken = formatTokenForSpeech(item.token, this.language);
    const text = isSecondCall
      ? `Second call. Token ${spokenToken}. Please proceed to ${item.room}.`
      : `Token ${spokenToken}. Please proceed to ${item.room}.`;
    return {
      event: item._originalEvent || item,
      item,
      isSecondCall,
      text,
    };
  }

  enqueue(itemOrEvent: AnnouncementItem | any, lang?: SupportedLanguage): boolean {
    if (lang) {
      this.language = lang;
    }

    const timestamp = itemOrEvent.timestamp || itemOrEvent.at || new Date().toISOString();
    const ageMs = Date.now() - new Date(timestamp).getTime();
    if (ageMs > 20000) {
      return false;
    }

    const item: AnnouncementItem & { _originalEvent?: any } = {
      id: itemOrEvent.id || `ann_${Date.now()}`,
      token: itemOrEvent.token,
      room: itemOrEvent.room,
      doctorName: itemOrEvent.doctorName || itemOrEvent.doctor_name,
      callCount: itemOrEvent.callCount ?? itemOrEvent.call_count ?? 1,
      timestamp,
      _originalEvent: itemOrEvent,
    };

    // Maintain FIFO cap of maxCapacity items: drop oldest if over
    if (this.queue.length >= this.maxCapacity) {
      this.queue.shift();
    }

    this.queue.push(item);
    this.processNext();
    return true;
  }

  clear() {
    this.queue = [];
    this.provider.cancel();
    this.isProcessing = false;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const current = this.queue.shift();
    if (!current) {
      this.isProcessing = false;
      return;
    }

    try {
      if (this.soundEnabled) {
        // 1. Play synthesized chime
        await playChime(this.volume);

        // 2. Build spoken announcement
        const spokenToken = formatTokenForSpeech(current.token, this.language);
        let message = '';
        if (current.callCount > 1) {
          if (this.language === 'ta') {
            message = `இரண்டாவது அழைப்பு. டோக்கன் எண் ${spokenToken}. அறை எண் ${current.room} க்கு வரவும்.`;
          } else if (this.language === 'hi') {
            message = `दूसरा बुलावा. टोकन संख्या ${spokenToken}. कृपया कमरा नंबर ${current.room} में जाएं.`;
          } else {
            message = `Second call. Token ${spokenToken}. Please proceed to Room ${current.room}.`;
          }
        } else {
          if (this.language === 'ta') {
            message = `டோக்கன் எண் ${spokenToken}. தயவுசெய்து அறை எண் ${current.room} க்கு வரவும்.`;
          } else if (this.language === 'hi') {
            message = `टोकन संख्या ${spokenToken}. कृपया कमरा नंबर ${current.room} में जाएं.`;
          } else {
            message = `Token ${spokenToken}. Please proceed to Room ${current.room}.`;
          }
        }

        // 3. Speak using speech synthesis
        await this.provider.speak(message, this.language);
      }
    } catch {
      // ignore audio errors
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        // Process next item in queue after short pause
        setTimeout(() => this.processNext(), 500);
      }
    }
  }
}

// Global announcement queue singleton
export const globalAnnouncementQueue = new AnnouncementQueue();
