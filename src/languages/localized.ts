import { formatWeatherName } from "../util/weatherDisplay";
import type { Language, LanguageKey, Locale, VoiceCommands } from "./types";

type LocalizedLanguageKey = Exclude<LanguageKey, "en" | "en-us" | "id">;

interface VoicePhrases {
    eightMinutes: string;
    fiveMinutes: string;
    fourMinutes: string;
    threeMinutes: string;
    twoMinutes: string;
    oneMinute: string;
    thirtySeconds: string;
    weatherReady: (weather: string) => string;
    changeInTen: string;
    changedTo: (weather: string) => string;
    startNow: string;
    skipTo: (weather: string) => string;
}

interface LocalizedLanguageDefinition {
    key: LocalizedLanguageKey;
    name: string;
    locale: Locale;
    phrases: VoicePhrases;
}

const definitions: LocalizedLanguageDefinition[] = [
    {
        key: "zh-cn",
        name: "简体中文",
        locale: "cmn-Hans-CN",
        phrases: {
            eightMinutes: "还剩8分钟。",
            fiveMinutes: "还剩5分钟。",
            fourMinutes: "还剩4分钟。",
            threeMinutes: "还剩3分钟。",
            twoMinutes: "还剩2分钟。",
            oneMinute: "还剩1分钟。",
            thirtySeconds: "还剩30秒。",
            weatherReady: (weather) => `${weather}，准备好。`,
            changeInTen: "10秒后更换。",
            changedTo: (weather) => `已切换为${weather}。`,
            startNow: "开始吧！",
            skipTo: (weather) => `切换为${weather}。`,
        },
    },
    {
        key: "fil",
        name: "Filipino",
        locale: "fil-PH",
        phrases: {
            eightMinutes: "May 8 minuto pa.",
            fiveMinutes: "May 5 minuto pa.",
            fourMinutes: "May 4 minuto pa.",
            threeMinutes: "May 3 minuto pa.",
            twoMinutes: "May 2 minuto pa.",
            oneMinute: "May 1 minuto pa.",
            thirtySeconds: "May 30 segundo pa.",
            weatherReady: (weather) => `${weather}, maghanda na.`,
            changeInTen: "Magpapalit sa loob ng 10 segundo.",
            changedTo: (weather) => `Nagpalit na sa ${weather}.`,
            startNow: "Simulan na natin!",
            skipTo: (weather) => `Magpalit sa ${weather}.`,
        },
    },
    {
        key: "fr",
        name: "Français",
        locale: "fr-FR",
        phrases: {
            eightMinutes: "Il reste 8 minutes.",
            fiveMinutes: "Il reste 5 minutes.",
            fourMinutes: "Il reste 4 minutes.",
            threeMinutes: "Il reste 3 minutes.",
            twoMinutes: "Il reste 2 minutes.",
            oneMinute: "Il reste 1 minute.",
            thirtySeconds: "Il reste 30 secondes.",
            weatherReady: (weather) => `${weather}, préparez-vous.`,
            changeInTen: "Changement dans 10 secondes.",
            changedTo: (weather) => `Passage à ${weather}.`,
            startNow: "C'est parti !",
            skipTo: (weather) => `Passage à ${weather}.`,
        },
    },
    {
        key: "de",
        name: "Deutsch",
        locale: "de-DE",
        phrases: {
            eightMinutes: "Noch 8 Minuten.",
            fiveMinutes: "Noch 5 Minuten.",
            fourMinutes: "Noch 4 Minuten.",
            threeMinutes: "Noch 3 Minuten.",
            twoMinutes: "Noch 2 Minuten.",
            oneMinute: "Noch 1 Minute.",
            thirtySeconds: "Noch 30 Sekunden.",
            weatherReady: (weather) => `${weather}, mach dich bereit.`,
            changeInTen: "Wechsel in 10 Sekunden.",
            changedTo: (weather) => `Wechsel zu ${weather}.`,
            startNow: "Los geht's!",
            skipTo: (weather) => `Wechsel zu ${weather}.`,
        },
    },
    {
        key: "hi",
        name: "हिन्दी",
        locale: "hi-IN",
        phrases: {
            eightMinutes: "8 मिनट बाकी हैं।",
            fiveMinutes: "5 मिनट बाकी हैं।",
            fourMinutes: "4 मिनट बाकी हैं।",
            threeMinutes: "3 मिनट बाकी हैं।",
            twoMinutes: "2 मिनट बाकी हैं।",
            oneMinute: "1 मिनट बाकी है।",
            thirtySeconds: "30 सेकंड बाकी हैं।",
            weatherReady: (weather) => `${weather}, तैयार हो जाइए।`,
            changeInTen: "10 सेकंड में बदलाव होगा।",
            changedTo: (weather) => `${weather} में बदलाव हो गया है।`,
            startNow: "चलिए शुरू करें!",
            skipTo: (weather) => `${weather} में बदलाव करें।`,
        },
    },
    {
        key: "ja",
        name: "日本語",
        locale: "ja-JP",
        phrases: {
            eightMinutes: "残り8分です。",
            fiveMinutes: "残り5分です。",
            fourMinutes: "残り4分です。",
            threeMinutes: "残り3分です。",
            twoMinutes: "残り2分です。",
            oneMinute: "残り1分です。",
            thirtySeconds: "残り30秒です。",
            weatherReady: (weather) => `${weather}です。準備してください。`,
            changeInTen: "10秒後に変更します。",
            changedTo: (weather) => `${weather}に変わりました。`,
            startNow: "始めましょう！",
            skipTo: (weather) => `${weather}に変更します。`,
        },
    },
    {
        key: "it",
        name: "Italiano",
        locale: "it-IT",
        phrases: {
            eightMinutes: "Mancano 8 minuti.",
            fiveMinutes: "Mancano 5 minuti.",
            fourMinutes: "Mancano 4 minuti.",
            threeMinutes: "Mancano 3 minuti.",
            twoMinutes: "Mancano 2 minuti.",
            oneMinute: "Manca 1 minuto.",
            thirtySeconds: "Mancano 30 secondi.",
            weatherReady: (weather) => `${weather}, preparati.`,
            changeInTen: "Cambio tra 10 secondi.",
            changedTo: (weather) => `Passaggio a ${weather}.`,
            startNow: "Si parte!",
            skipTo: (weather) => `Passa a ${weather}.`,
        },
    },
    {
        key: "jv",
        name: "Basa Jawa",
        locale: "jv-ID",
        phrases: {
            eightMinutes: "Isih 8 menit.",
            fiveMinutes: "Isih 5 menit.",
            fourMinutes: "Isih 4 menit.",
            threeMinutes: "Isih 3 menit.",
            twoMinutes: "Isih 2 menit.",
            oneMinute: "Isih 1 menit.",
            thirtySeconds: "Isih 30 detik.",
            weatherReady: (weather) => `${weather}, siyap-siyap.`,
            changeInTen: "Ganti sajrone 10 detik.",
            changedTo: (weather) => `Ganti dadi ${weather}.`,
            startNow: "Ayo diwiwiti!",
            skipTo: (weather) => `Ganti dadi ${weather}.`,
        },
    },
    {
        key: "ms",
        name: "Bahasa Melayu",
        locale: "ms-MY",
        phrases: {
            eightMinutes: "8 minit lagi.",
            fiveMinutes: "5 minit lagi.",
            fourMinutes: "4 minit lagi.",
            threeMinutes: "3 minit lagi.",
            twoMinutes: "2 minit lagi.",
            oneMinute: "1 minit lagi.",
            thirtySeconds: "30 saat lagi.",
            weatherReady: (weather) => `${weather}, bersedia.`,
            changeInTen: "Bertukar dalam 10 saat.",
            changedTo: (weather) => `Bertukar kepada ${weather}.`,
            startNow: "Mari bermula!",
            skipTo: (weather) => `Bertukar kepada ${weather}.`,
        },
    },
    {
        key: "pt",
        name: "Português (Portugal)",
        locale: "pt-PT",
        phrases: {
            eightMinutes: "Faltam 8 minutos.",
            fiveMinutes: "Faltam 5 minutos.",
            fourMinutes: "Faltam 4 minutos.",
            threeMinutes: "Faltam 3 minutos.",
            twoMinutes: "Faltam 2 minutos.",
            oneMinute: "Falta 1 minuto.",
            thirtySeconds: "Faltam 30 segundos.",
            weatherReady: (weather) => `${weather}, prepare-se.`,
            changeInTen: "Mudança dentro de 10 segundos.",
            changedTo: (weather) => `Mudou para ${weather}.`,
            startNow: "Vamos começar!",
            skipTo: (weather) => `Mudar para ${weather}.`,
        },
    },
    {
        key: "ru",
        name: "Русский",
        locale: "ru-RU",
        phrases: {
            eightMinutes: "Осталось 8 минут.",
            fiveMinutes: "Осталось 5 минут.",
            fourMinutes: "Осталось 4 минуты.",
            threeMinutes: "Осталось 3 минуты.",
            twoMinutes: "Осталось 2 минуты.",
            oneMinute: "Осталась 1 минута.",
            thirtySeconds: "Осталось 30 секунд.",
            weatherReady: (weather) => `${weather}, приготовься.`,
            changeInTen: "Смена через 10 секунд.",
            changedTo: (weather) => `Переход на ${weather}.`,
            startNow: "Начинаем!",
            skipTo: (weather) => `Перейти на ${weather}.`,
        },
    },
    {
        key: "su",
        name: "Basa Sunda",
        locale: "su-ID",
        phrases: {
            eightMinutes: "Sésa 8 menit.",
            fiveMinutes: "Sésa 5 menit.",
            fourMinutes: "Sésa 4 menit.",
            threeMinutes: "Sésa 3 menit.",
            twoMinutes: "Sésa 2 menit.",
            oneMinute: "Sésa 1 menit.",
            thirtySeconds: "Sésa 30 detik.",
            weatherReady: (weather) => `${weather}, siap-siap.`,
            changeInTen: "Ganti dina 10 detik.",
            changedTo: (weather) => `Diganti jadi ${weather}.`,
            startNow: "Hayu urang mimitian!",
            skipTo: (weather) => `Ganti ka ${weather}.`,
        },
    },
    {
        key: "th",
        name: "ไทย",
        locale: "th-TH",
        phrases: {
            eightMinutes: "เหลืออีก 8 นาที",
            fiveMinutes: "เหลืออีก 5 นาที",
            fourMinutes: "เหลืออีก 4 นาที",
            threeMinutes: "เหลืออีก 3 นาที",
            twoMinutes: "เหลืออีก 2 นาที",
            oneMinute: "เหลืออีก 1 นาที",
            thirtySeconds: "เหลืออีก 30 วินาที",
            weatherReady: (weather) => `${weather} เตรียมตัวให้พร้อม`,
            changeInTen: "เปลี่ยนในอีก 10 วินาที",
            changedTo: (weather) => `เปลี่ยนเป็น${weather}แล้ว`,
            startNow: "เริ่มกันเลย!",
            skipTo: (weather) => `เปลี่ยนเป็น${weather}`,
        },
    },
    {
        key: "ar",
        name: "العربية",
        locale: "ar-SA",
        phrases: {
            eightMinutes: "تبقّت 8 دقائق.",
            fiveMinutes: "تبقّت 5 دقائق.",
            fourMinutes: "تبقّت 4 دقائق.",
            threeMinutes: "تبقّت 3 دقائق.",
            twoMinutes: "تبقّت دقيقتان.",
            oneMinute: "تبقّت دقيقة واحدة.",
            thirtySeconds: "تبقّت 30 ثانية.",
            weatherReady: (weather) => `${weather}، استعد.`,
            changeInTen: "التغيير خلال 10 ثوانٍ.",
            changedTo: (weather) => `تم التغيير إلى ${weather}.`,
            startNow: "لنبدأ!",
            skipTo: (weather) => `غيّر إلى ${weather}.`,
        },
    },
    {
        key: "es",
        name: "Español",
        locale: "es-ES",
        phrases: {
            eightMinutes: "Quedan 8 minutos.",
            fiveMinutes: "Quedan 5 minutos.",
            fourMinutes: "Quedan 4 minutos.",
            threeMinutes: "Quedan 3 minutos.",
            twoMinutes: "Quedan 2 minutos.",
            oneMinute: "Queda 1 minuto.",
            thirtySeconds: "Quedan 30 segundos.",
            weatherReady: (weather) => `${weather}, prepárate.`,
            changeInTen: "Cambio en 10 segundos.",
            changedTo: (weather) => `Cambio a ${weather}.`,
            startNow: "¡Vamos!",
            skipTo: (weather) => `Cambiar a ${weather}.`,
        },
    },
];

function createVoiceCommands(phrases: VoicePhrases): VoiceCommands {
    const formatWeather = (value: unknown): string => formatWeatherName(String(value ?? ""));

    return {
        480: () => phrases.eightMinutes,
        300: () => phrases.fiveMinutes,
        240: () => phrases.fourMinutes,
        180: () => phrases.threeMinutes,
        120: () => phrases.twoMinutes,
        60: () => phrases.oneMinute,
        30: () => phrases.thirtySeconds,
        15: ({ nextAthlete }) => [
            { text: phrases.weatherReady(formatWeather(nextAthlete)), pauseAfterMs: 2_000 },
            { text: phrases.changeInTen },
        ],
        0: ({ nextAthlete, started }) =>
            started ? phrases.changedTo(formatWeather(nextAthlete)) : phrases.startNow,
        skip: ({ nextAthlete }) => phrases.skipTo(formatWeather(nextAthlete)),
    };
}

export const localizedLanguages: Language[] = definitions.map(({ phrases, ...language }) => ({
    ...language,
    voiceCommands: createVoiceCommands(phrases),
}));

export const DEFAULT_WEATHER_NAMES: Record<LanguageKey, string> = {
    en: "extreme weather",
    "en-us": "extreme weather",
    id: "cuaca buruk",
    "zh-cn": "极端天气",
    fil: "matinding panahon",
    fr: "météo extrême",
    de: "extremes Wetter",
    hi: "चरम मौसम",
    ja: "異常気象",
    it: "meteo estremo",
    jv: "cuaca ekstrem",
    ms: "cuaca ekstrem",
    pt: "condições meteorológicas extremas",
    ru: "экстремальная погода",
    su: "cuaca ekstrem",
    th: "สภาพอากาศรุนแรง",
    ar: "طقس قاسٍ",
    es: "clima extremo",
};

export const DEFAULT_WEATHER_NAME_ALIASES = new Set(
    Object.values(DEFAULT_WEATHER_NAMES).map((name) => name.toLowerCase().trim())
);
