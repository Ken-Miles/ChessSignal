import { GameSource, GameSourceType, getGameSource } from "@/components/chess/GameSelector/GameSource";
import {
    buildChessComGameUrl,
    parseChessComGameSelectionFromInput,
    ChessComGameType
} from "@/lib/games/chessCom";

const isProductionMode = process.env.NODE_ENV == "production";

export type AnalysisPerspective = "white" | "black" | "auto";

export const analysisSelectionUrlKeys = {
    gameSource: "source",
    gameInput: "input",
    perspective: "perspective",
    chessComUsername: "chesscom_username",
    chessComGameId: "chesscom_game_id",
    chessComGameType: "chesscom_game_type",
    lichessUsername: "lichess_username",
    fen: "fen",
    pgn: "pgn"
} as const;

const legacyAnalysisSelectionUrlKeys = {
    gameSource: "game_source",
    gameInput: "game_input",
    perspective: "game_perspective"
} as const;

export const analysisArchiveUrlKeys = {
    gameId: "archive"
} as const;

export const analysisMoveUrlKeys = {
    move: "move"
} as const;

const legacyAnalysisArchiveUrlKeys = {
    gameId: "game"
} as const;

export const analysisSelectionUrlKeyList = Object.values(
    analysisSelectionUrlKeys
).concat(Object.values(
    legacyAnalysisSelectionUrlKeys
));

export const analysisArchiveUrlKeyList = [
    analysisArchiveUrlKeys.gameId,
    legacyAnalysisArchiveUrlKeys.gameId
];

const analysisQueryPriorityKeys = [
    analysisSelectionUrlKeys.gameSource,
    analysisArchiveUrlKeys.gameId,
    analysisSelectionUrlKeys.chessComGameId,
    analysisSelectionUrlKeys.chessComGameType
] as const;

const analysisQueryTrailingKeys = [
    analysisSelectionUrlKeys.perspective,
    analysisMoveUrlKeys.move
] as const;

function reorderAnalysisSearchParams(searchParams: URLSearchParams) {
    const orderedSearchParams = new URLSearchParams();

    for (const key of analysisQueryPriorityKeys) {
        if (searchParams.has(key)) {
            orderedSearchParams.set(key, searchParams.get(key) || "");
        }
    }

    for (const [key, value] of searchParams.entries()) {
        if (analysisQueryPriorityKeys.includes(key as any)) continue;
        if (analysisQueryTrailingKeys.includes(key as any)) continue;

        orderedSearchParams.set(key, value);
    }

    for (const key of analysisQueryTrailingKeys) {
        if (searchParams.has(key)) {
            orderedSearchParams.set(key, searchParams.get(key) || "");
        }
    }

    return orderedSearchParams;
}

function normaliseMovePly(value?: number) {
    if (value == undefined || Number.isNaN(value)) {
        return;
    }

    return Math.max(0, Math.trunc(value));
}

export function getAnalysisMovePlyFromUrl(searchParams: URLSearchParams) {
    const rawValue = searchParams.get(analysisMoveUrlKeys.move);
    if (!rawValue) {
        return;
    }

    return normaliseMovePly(Number(rawValue));
}

export function updateAnalysisMoveUrl(
    searchParams: URLSearchParams,
    movePly?: number
) {
    const nextSearchParams = new URLSearchParams(searchParams);
    const nextMovePly = normaliseMovePly(movePly);

    if (nextMovePly == undefined) {
        nextSearchParams.delete(analysisMoveUrlKeys.move);

        return nextSearchParams;
    }

    nextSearchParams.set(
        analysisMoveUrlKeys.move,
        nextMovePly.toString()
    );

    return reorderAnalysisSearchParams(nextSearchParams);
}

function getSearchParam(
    searchParams: URLSearchParams,
    key: string,
    legacyKey?: string
) {
    return searchParams.get(key)
        || (legacyKey ? searchParams.get(legacyKey) : null);
}

export function getAnalysisArchiveGameIdFromUrl(searchParams: URLSearchParams) {
    return getSearchParam(
        searchParams,
        analysisArchiveUrlKeys.gameId,
        legacyAnalysisArchiveUrlKeys.gameId
    ) || undefined;
}

export function updateAnalysisArchiveGameIdUrl(
    searchParams: URLSearchParams,
    gameId?: string
) {
    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.delete(legacyAnalysisArchiveUrlKeys.gameId);

    if (gameId) {
        nextSearchParams.set(analysisArchiveUrlKeys.gameId, gameId);
    } else {
        nextSearchParams.delete(analysisArchiveUrlKeys.gameId);
    }

    return reorderAnalysisSearchParams(nextSearchParams);
}

export function isChessComGameUrl(value: string) {
    return parseChessComGameSelectionFromInput(value) != undefined;
}

export function getAnalysisSelectionFromUrl(searchParams: URLSearchParams) {
    const sourceKeyFromUrl = getSearchParam(
        searchParams,
        analysisSelectionUrlKeys.gameSource,
        legacyAnalysisSelectionUrlKeys.gameSource
    );
    const gameInput = getSearchParam(
        searchParams,
        analysisSelectionUrlKeys.gameInput,
        legacyAnalysisSelectionUrlKeys.gameInput
    ) || "";
    const chessComGameId = searchParams.get(analysisSelectionUrlKeys.chessComGameId) || undefined;
    const chessComGameTypeFromUrl = searchParams.get(analysisSelectionUrlKeys.chessComGameType) as ChessComGameType | null;
    const chessComGameType = isProductionMode && chessComGameTypeFromUrl == "live"
        ? null
        : chessComGameTypeFromUrl;
    const chessComGameUrl = chessComGameId && chessComGameType
        ? buildChessComGameUrl(chessComGameType, chessComGameId)
        : undefined;

    const resolvedSourceKey = (
        sourceKeyFromUrl
        || (parseChessComGameSelectionFromInput(gameInput)?.gameType == "live" && !isProductionMode
            ? GameSource.CHESS_COM_LIVE.key
            : undefined)
        || (parseChessComGameSelectionFromInput(gameInput)
            ? GameSource.CHESS_COM.key
            : undefined)
        || (chessComGameId
            ? (chessComGameType == "live" && !isProductionMode
                ? GameSource.CHESS_COM_LIVE.key
                : GameSource.CHESS_COM.key)
            : undefined)
        || (searchParams.get(analysisSelectionUrlKeys.lichessUsername)
            ? GameSource.LICHESS.key
            : undefined)
        || (searchParams.get(analysisSelectionUrlKeys.fen)
            ? GameSource.FEN.key
            : undefined)
        || (searchParams.get(analysisSelectionUrlKeys.pgn)
            ? GameSource.PGN.key
            : undefined)
        || GameSource.PGN.key
    );

    const sourceKey = getGameSource(resolvedSourceKey).key as GameSourceType;

    const input = gameInput
        || chessComGameUrl
        || searchParams.get(analysisSelectionUrlKeys.chessComUsername)
        || searchParams.get(analysisSelectionUrlKeys.lichessUsername)
        || searchParams.get(analysisSelectionUrlKeys.fen)
        || searchParams.get(analysisSelectionUrlKeys.pgn)
        || "";

    const perspective = getSearchParam(
        searchParams,
        analysisSelectionUrlKeys.perspective,
        legacyAnalysisSelectionUrlKeys.perspective
    ) as AnalysisPerspective | null;

    return {
        sourceKey,
        input,
        perspective: perspective == "white" || perspective == "black" || perspective == "auto"
            ? perspective
            : undefined
    };
}

export function updateAnalysisSelectionUrl(
    searchParams: URLSearchParams,
    input: {
        sourceKey?: GameSourceType;
        fieldInput?: string;
        perspective?: AnalysisPerspective;
    }
) {
    const nextSearchParams = new URLSearchParams(searchParams);
    const sourceKey = isProductionMode && input.sourceKey == GameSource.CHESS_COM_LIVE.key
        ? GameSource.CHESS_COM.key
        : input.sourceKey;

    for (const key of analysisSelectionUrlKeyList) {
        nextSearchParams.delete(key);
    }

    nextSearchParams.delete(analysisMoveUrlKeys.move);

    if (sourceKey) {
        nextSearchParams.set(
            analysisSelectionUrlKeys.gameSource,
            sourceKey
        );
    }

    if (input.fieldInput != undefined) {
        nextSearchParams.set(
            analysisSelectionUrlKeys.gameInput,
            input.fieldInput
        );
    }

    if (input.perspective) {
        nextSearchParams.set(
            analysisSelectionUrlKeys.perspective,
            input.perspective
        );
    }

    if (!sourceKey || input.fieldInput == undefined) {
        return nextSearchParams;
    }

    if (sourceKey == GameSource.CHESS_COM.key || sourceKey == GameSource.CHESS_COM_LIVE.key) {
        const parsedGame = parseChessComGameSelectionFromInput(input.fieldInput);

        if (parsedGame?.gameId) {
            nextSearchParams.delete(analysisSelectionUrlKeys.gameInput);

            nextSearchParams.set(
                analysisSelectionUrlKeys.chessComGameId,
                parsedGame.gameId
            );

            if (parsedGame.gameType && !(isProductionMode && parsedGame.gameType == "live")) {
                nextSearchParams.set(
                    analysisSelectionUrlKeys.chessComGameType,
                    parsedGame.gameType
                );
            } else if (sourceKey == GameSource.CHESS_COM_LIVE.key && !isProductionMode) {
                nextSearchParams.set(
                    analysisSelectionUrlKeys.chessComGameType,
                    "live"
                );
            }
        } else {
            nextSearchParams.set(
                analysisSelectionUrlKeys.chessComUsername,
                input.fieldInput
            );
        }
    } else if (input.sourceKey == GameSource.LICHESS.key) {
        nextSearchParams.set(
            analysisSelectionUrlKeys.lichessUsername,
            input.fieldInput
        );
    } else if (input.sourceKey == GameSource.FEN.key) {
        nextSearchParams.set(analysisSelectionUrlKeys.fen, input.fieldInput);
    } else if (input.sourceKey == GameSource.PGN.key) {
        nextSearchParams.set(analysisSelectionUrlKeys.pgn, input.fieldInput);
    }

    return reorderAnalysisSearchParams(nextSearchParams);
}

export function updateAnalysisPerspectiveUrl(
    searchParams: URLSearchParams,
    perspective: AnalysisPerspective
) {
    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.set(
        analysisSelectionUrlKeys.perspective,
        perspective
    );

    return reorderAnalysisSearchParams(nextSearchParams);
}