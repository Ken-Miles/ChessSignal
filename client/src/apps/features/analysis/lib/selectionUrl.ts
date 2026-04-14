import { GameSource, GameSourceType, getGameSource } from "@/components/chess/GameSelector/GameSource";
import {
    buildChessComGameUrl,
    parseChessComGameSelectionFromInput,
    ChessComGameType
} from "@/lib/games/chessCom";

const isProductionMode = process.env.NODE_ENV == "production";

export type AnalysisPerspective = "white" | "black" | "auto";

export const analysisSelectionUrlKeys = {
    gameSource: "game_source",
    gameInput: "game_input",
    perspective: "game_perspective",
    chessComUsername: "chesscom_username",
    chessComGameId: "chesscom_game_id",
    chessComGameType: "chesscom_game_type",
    lichessUsername: "lichess_username",
    fen: "fen",
    pgn: "pgn"
} as const;

export const analysisSelectionUrlKeyList = Object.values(
    analysisSelectionUrlKeys
);

export function isChessComGameUrl(value: string) {
    return parseChessComGameSelectionFromInput(value) != undefined;
}

export function getAnalysisSelectionFromUrl(searchParams: URLSearchParams) {
    const sourceKeyFromUrl = searchParams.get(
        analysisSelectionUrlKeys.gameSource
    );
    const gameInput = searchParams.get(analysisSelectionUrlKeys.gameInput) || "";
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

    const perspective = searchParams.get(
        analysisSelectionUrlKeys.perspective
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
        const canonicalGameUrl = parsedGame?.gameUrl || input.fieldInput;

        if (parsedGame?.gameId) {
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

            nextSearchParams.set(
                analysisSelectionUrlKeys.gameInput,
                canonicalGameUrl
            );
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

    return nextSearchParams;
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

    return nextSearchParams;
}