import EngineVersion from "shared/constants/EngineVersion";

const availabilityCache = new Map<EngineVersion, Promise<boolean>>();

const requiredWasmAssets: Partial<Record<EngineVersion, string[]>> = {
    [EngineVersion.STOCKFISH_17_LITE]: [
        "/engines/stockfish/17/stockfish-17-lite-single.wasm"
    ],
    [EngineVersion.STOCKFISH_17]: [
        "/engines/stockfish/17/stockfish-17-single-part-0.wasm",
        "/engines/stockfish/17/stockfish-17-single-part-1.wasm",
        "/engines/stockfish/17/stockfish-17-single-part-2.wasm",
        "/engines/stockfish/17/stockfish-17-single-part-3.wasm",
        "/engines/stockfish/17/stockfish-17-single-part-4.wasm",
        "/engines/stockfish/17/stockfish-17-single-part-5.wasm"
    ],
    [EngineVersion.STOCKFISH_18_LITE]: [
        "/engines/stockfish/18/stockfish-18-lite.wasm"
    ],
    [EngineVersion.STOCKFISH_18_LITE_SINGLE]: [
        "/engines/stockfish/18/stockfish-18-lite-single.wasm"
    ],
    [EngineVersion.STOCKFISH_18]: [
        "/engines/stockfish/18/stockfish-18.wasm"
    ],
    [EngineVersion.STOCKFISH_18_SINGLE]: [
        "/engines/stockfish/18/stockfish-18-single.wasm"
    ]
};

async function assetExists(path: string): Promise<boolean> {
    try {
        const response = await fetch(path, {
            method: "HEAD",
            cache: "no-store"
        });

        return response.ok;
    } catch {
        return false;
    }
}

export async function isEngineVersionAvailable(
    version: EngineVersion
): Promise<boolean> {
    const cachedResult = availabilityCache.get(version);
    if (cachedResult) {
        return cachedResult;
    }

    const availabilityPromise = (async () => {
        const workerExists = await assetExists(`/engines/${version}`);
        if (!workerExists) {
            return false;
        }

        const dependencies = requiredWasmAssets[version] || [];
        if (!dependencies.length) {
            return true;
        }

        const dependencyChecks = await Promise.all(
            dependencies.map(assetExists)
        );

        return dependencyChecks.every(Boolean);
    })();

    availabilityCache.set(version, availabilityPromise);

    return availabilityPromise;
}

export async function findFirstAvailableEngineVersion(
    versions: EngineVersion[]
): Promise<EngineVersion | undefined> {
    for (const version of versions) {
        if (await isEngineVersionAvailable(version)) {
            return version;
        }
    }

    return undefined;
}