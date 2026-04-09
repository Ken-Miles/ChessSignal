import { create } from "zustand";
import { produce } from "immer";
import { cloneDeep, merge } from "lodash-es";
import z from "zod";

import EngineVersion from "shared/constants/EngineVersion";
import EngineArrowType from "@analysis/constants/EngineArrowType";
import LocalStorageKey from "@/constants/LocalStorageKey";

const settingsSchema = z.object({
    analysis: z.object({
        engine: z.object({
            enabled: z.boolean(),
            version: z.enum(EngineVersion),
            depth: z.number().min(10).max(99).optional(),
            timeLimitEnabled: z.boolean(),
            timeLimit: z.number().min(0.01),
            lines: z.number().min(1).max(5),
            threads: z.number().min(1).max(64),
            suggestionArrows: z.enum(EngineArrowType)
        }),
        classifications: z.object({
            hide: z.boolean(),
            included: z.object({
                brilliant: z.boolean(),
                critical: z.boolean(),
                theory: z.boolean()
            })
        }),
        simpleNotation: z.boolean()
    }),
    themes: z.object({
        board: z.object({
            darkSquareColour: z.string().regex(/^#.{6}$/),
            lightSquareColour: z.string().regex(/^#.{6}$/),
            texture: z.string().optional()
        }),
        piece: z.string(),
        preset: z.string().optional(),
        appBackground: z.string().optional()
    }),
    bugReportingMode: z.boolean()
});

type Settings = z.infer<typeof settingsSchema>;
type SettingsReducer = (settings: Settings) => Settings;

const legacyEngineVersionMap: Record<string, EngineVersion> = {
    "stockfish-17-asm.js": EngineVersion.STOCKFISH_17_ASM,
    "stockfish-17-lite-single.js": EngineVersion.STOCKFISH_17_LITE,
    "stockfish-17-single.js": EngineVersion.STOCKFISH_17,
    "stockfish-18-asm.js": EngineVersion.STOCKFISH_18_ASM,
    "stockfish-18-lite-single.js": EngineVersion.STOCKFISH_18_LITE,
    "stockfish-18-single.js": EngineVersion.STOCKFISH_18
};

export const defaultSettings: Settings = {
    analysis: {
        engine: {
            enabled: true,
            version: EngineVersion.STOCKFISH_18_LITE,
            depth: undefined,
            lines: 2,
            timeLimitEnabled: true,
            timeLimit: 5,
            threads: 4,
            suggestionArrows: EngineArrowType.DISABLED
        },
        classifications: {
            hide: false,
            included: {
                brilliant: true,
                critical: true,
                theory: true
            }
        },
        simpleNotation: false
    },
    themes: {
        board: {
            darkSquareColour: "#b58863",
            lightSquareColour: "#f0d9b5",
            texture: ""
        },
        piece: "",
        preset: "",
        appBackground: ""
    },
    bugReportingMode: false
};

function fetchSettings() {
    const value = localStorage.getItem(LocalStorageKey.SETTINGS);

    const defaultSettingsCopy = cloneDeep(defaultSettings);

    if (value == null) return defaultSettingsCopy;

    try {
        const parsedSettings = merge(defaultSettingsCopy, JSON.parse(value));

        const legacyVersion = legacyEngineVersionMap[
            parsedSettings.analysis.engine.version
        ];
        if (legacyVersion) {
            parsedSettings.analysis.engine.version = legacyVersion;
        }

        return parsedSettings;
    } catch {
        return defaultSettingsCopy;
    }
}

interface SettingsStore {
    settings: Settings;
    setSettings: (updater: SettingsReducer) => void;
}

const useSettingsStore = create<SettingsStore>((set, get) => ({
    settings: fetchSettings(),

    setSettings(updater) {
        const newSettings = produce(get().settings, updater);

        set({ settings: newSettings });

        localStorage.setItem(
            LocalStorageKey.SETTINGS,
            JSON.stringify(newSettings)
        );
    }
}));

export default useSettingsStore;