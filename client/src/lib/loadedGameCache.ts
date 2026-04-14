import { cloneDeep } from "lodash-es";

import AnalysedGame, { SerializedAnalysedGame } from "shared/types/game/AnalysedGame";
import { deserializeNode, serializeNode } from "shared/types/game/position/StateTreeNode";

import LocalStorageKey from "@/constants/LocalStorageKey";

const loadedGameCacheAgeMs = 1000 * 60 * 60 * 24;
const loadedGameCacheMaxEntries = 10;

interface LoadedGameCacheEntry {
    savedAt: number;
    game: SerializedAnalysedGame;
}

function readCache(): Record<string, LoadedGameCacheEntry> {
    try {
        return JSON.parse(
            localStorage.getItem(LocalStorageKey.LOADED_GAMES_CACHE) || "{}"
        ) as Record<string, LoadedGameCacheEntry>;
    } catch {
        return {};
    }
}

function writeCache(cache: Record<string, LoadedGameCacheEntry>) {
    localStorage.setItem(
        LocalStorageKey.LOADED_GAMES_CACHE,
        JSON.stringify(cache)
    );
}

function pruneCache(cache: Record<string, LoadedGameCacheEntry>) {
    const now = Date.now();

    const entries = Object.entries(cache)
        .filter(([, entry]) => now - entry.savedAt <= loadedGameCacheAgeMs)
        .sort(([, left], [, right]) => right.savedAt - left.savedAt)
        .slice(0, loadedGameCacheMaxEntries);

    return Object.fromEntries(entries);
}

export function getLoadedGameCacheKey(input: {
    sourceKey: string;
    gameInput: string;
    engineVersion: string;
}) {
    return `${input.sourceKey}:${input.engineVersion}:${input.gameInput.trim()}`;
}

export function getCachedLoadedGame(cacheKey: string): AnalysedGame | undefined {
    const cache = pruneCache(readCache());
    const entry = cache[cacheKey];

    if (!entry) return;

    writeCache(cache);

    return {
        ...entry.game,
        stateTree: deserializeNode(entry.game.stateTree)
    };
}

export function setCachedLoadedGame(cacheKey: string, game: AnalysedGame) {
    const cache = pruneCache(readCache());

    cache[cacheKey] = {
        savedAt: Date.now(),
        game: {
            ...cloneDeep(game),
            stateTree: serializeNode(cloneDeep(game.stateTree))
        }
    };

    writeCache(cache);
}

export function clearCachedLoadedGame(cacheKey: string) {
    const cache = pruneCache(readCache());

    if (!(cacheKey in cache)) {
        return;
    }

    delete cache[cacheKey];

    writeCache(cache);
}
