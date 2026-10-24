import { Language as GoogleTTSLanguage } from "google-tts-api/dist/types";

export interface SpeechSegment {
    text: string;
    pauseAfterMs?: number;
}

export type SpeechCommand = string | SpeechSegment[];
export type VoiceCommands = Record<string, (args: Record<string, unknown>) => SpeechCommand>;

export type LanguageKey =
    | "en"
    | "en-us"
    | "id"
    | "id-mp3"
    | "zh-cn"
    | "fil"
    | "fr"
    | "de"
    | "hi"
    | "ja"
    | "it"
    | "jv"
    | "ms"
    | "pt"
    | "ru"
    | "su"
    | "th"
    | "ar"
    | "es";
export interface Language {
    key: LanguageKey;
    name: string;
    locale: Locale;
    voiceCommands: VoiceCommands;
    audioCommands?: Record<string, string>;
}

export type Locale = GoogleTTSLanguage;
