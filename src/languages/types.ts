import { Language as GoogleTTSLanguage } from "google-tts-api/dist/types";

export interface SpeechSegment {
    text: string;
    pauseAfterMs?: number;
}

export type SpeechCommand = string | SpeechSegment[];
export type VoiceCommands = Record<string, (args: Record<string, unknown>) => SpeechCommand>;

export type LanguageKey = "en" | "en-us" | "id";
export interface Language {
    key: LanguageKey;
    name: string;
    locale: Locale;
    voiceCommands: VoiceCommands;
}

export type Locale = GoogleTTSLanguage;
