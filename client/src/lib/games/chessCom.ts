import { Chess, Move } from "chess.js";
import { StatusCodes } from "http-status-codes";

import Game from "shared/types/game/Game";
import { GameResult } from "shared/constants/game/GameResult";
import TimeControl from "shared/constants/game/TimeControl";
import Variant from "shared/constants/game/Variant";
import { padDateNumber } from "shared/lib/utils/date";
import { STARTING_FEN } from "shared/constants/utils";
import APIResponse from "@/types/APIResponse";

export type ChessComGameType = "live" | "daily" | "computer" | "master";

export interface ChessComGameSelection {
    gameType?: ChessComGameType;
    gameId: string;
    gameUrl?: string;
}

const chessComMoveNotation = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?{~}(^)[_]@#$,./&-*++=";
const chessComPromotionNotation = "qnrbkp";

// Map from chess.com time controls to ours
const timeControlCodes: Record<string, TimeControl | undefined> = {
    bullet: TimeControl.BULLET,
    blitz: TimeControl.BLITZ,
    rapid: TimeControl.RAPID,
    daily: TimeControl.CORRESPONDENCE
};

// Map from chess.com variants to ours
const variantCodes: Record<string, Variant | undefined> = {
    chess: Variant.STANDARD,
    chess960: Variant.CHESS960
};

// Map from chess.com game results to ours
const gameResultCodes: Record<string, GameResult | undefined> = {
    win: GameResult.WIN,
    checkmated: GameResult.LOSE,
    agreed: GameResult.DRAW,
    repetition: GameResult.DRAW,
    timeout: GameResult.LOSE,
    resigned: GameResult.LOSE,
    stalemate: GameResult.DRAW,
    lose: GameResult.LOSE,
    insufficient: GameResult.DRAW,
    "50move": GameResult.DRAW,
    abandoned: GameResult.LOSE,
    timevsinsufficient: GameResult.DRAW
};

const futureFetchError = "Date cannot be set in the future";

interface ChessComCallbackGameResponse {
    game: {
        initialSetup?: string;
        colorOfWinner?: "white" | "black" | null;
        isFinished?: boolean;
        gameEndReason?: string;
        endTime?: number;
        startTime?: number;
        timeControl?: {
            baseMs?: number;
        };
        baseTime1?: number;
        timeIncrement1?: number;
        pgnHeaders?: Record<string, string>;
        moveList?: string;
        moveTimestamps?: string;
        type?: string;
    };
    players: {
        top: {
            username?: string;
            rating?: number;
            avatarUrl?: string;
        };
        bottom: {
            username?: string;
            rating?: number;
            avatarUrl?: string;
        };
    };
}

function parseChessComMoveTimestamps(
    game: ChessComCallbackGameResponse["game"]
) {
    const rawValues = (game.moveTimestamps || "")
        .split(",")
        .map(value => Number(value.trim()))
        .filter(value => !Number.isNaN(value));

    if (rawValues.length == 0) return [];

    const baseTimeMs = game.timeControl?.baseMs || (game.baseTime1 ? game.baseTime1 * 100 : undefined);
    const shouldScaleCentiseconds = baseTimeMs != undefined
        && rawValues.every(value => value < baseTimeMs / 10);

    return rawValues.map(value => Math.round(value * (shouldScaleCentiseconds ? 100 : 1)));
}

function normaliseChessComUrl(input: string) {
    const trimmedInput = input.trim();

    if (!trimmedInput) return;
    if (/^\d+$/.test(trimmedInput)) return;

    if (/^https?:\/\//i.test(trimmedInput)) {
        return new URL(trimmedInput);
    }

    if (
        trimmedInput.startsWith("chess.com/")
        || trimmedInput.startsWith("www.chess.com/")
        || trimmedInput.startsWith("link.chess.com/")
    ) {
        return new URL(`https://${trimmedInput}`);
    }

    if (trimmedInput.startsWith("/")) {
        return new URL(`https://www.chess.com${trimmedInput}`);
    }

    return;
}

function buildChessComGameUrl(gameType: ChessComGameType, gameId: string) {
    return `https://www.chess.com/game/${gameType}/${gameId}`;
}

export { buildChessComGameUrl };

export function parseChessComGameSelection(input: string): ChessComGameSelection | undefined {
    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    if (/^\d+$/.test(trimmedInput)) {
        return { gameId: trimmedInput };
    }

    const url = normaliseChessComUrl(trimmedInput);
    if (!url) return;

    const path = url.pathname.replace(/^\/+/, "");

    const liveDailyAnalysisMatch = path.match(
        /^(?:analysis\/)?game\/(live|daily|computer|master)\/(\d+)(?:\/(?:review|analysis))?$/
    );

    if (liveDailyAnalysisMatch) {
        const [, gameType, gameId] = liveDailyAnalysisMatch;

        return {
            gameType: gameType as ChessComGameType,
            gameId,
            gameUrl: buildChessComGameUrl(gameType as ChessComGameType, gameId)
        };
    }

    const bareGameMatch = path.match(/^game\/(\d+)(?:\/.*)?$/);
    if (bareGameMatch) {
        return {
            gameType: "live",
            gameId: bareGameMatch[1],
            gameUrl: buildChessComGameUrl("live", bareGameMatch[1])
        };
    }

    const liveGameMatch = path.match(/^(live|daily|computer|master)\/game\/(\d+)(?:\/.*)?$/);
    if (liveGameMatch) {
        const [, gameType, gameId] = liveGameMatch;

        return {
            gameType: gameType as ChessComGameType,
            gameId,
            gameUrl: buildChessComGameUrl(gameType as ChessComGameType, gameId)
        };
    }

    const importedGameMatch = path.match(/^games\/view\/(\d+)(?:\/.*)?$/);
    if (importedGameMatch) {
        return {
            gameType: "master",
            gameId: importedGameMatch[1],
            gameUrl: buildChessComGameUrl("master", importedGameMatch[1])
        };
    }

    return;
}

function decodeChessComMoveList(moveNotation: string): Pick<Move, "from" | "to" | "promotion">[] {
    const moves: Pick<Move, "from" | "to" | "promotion">[] = [];

    for (let index = 0; index < moveNotation.length; index += 2) {
        const fromIndex = chessComMoveNotation.indexOf(moveNotation[index]);
        let toIndex = chessComMoveNotation.indexOf(moveNotation[index + 1]);

        if (fromIndex < 0 || toIndex < 0) continue;

        let promotion: Move["promotion"] | undefined;

        if (toIndex > 63) {
            const promotionIndex = Math.floor((toIndex - 64) / 3);
            promotion = chessComPromotionNotation[promotionIndex] as Move["promotion"];

            if (!["q", "n", "r", "b"].includes(promotion || "")) {
                promotion = undefined;
            }

            toIndex = fromIndex + (fromIndex < 16 ? -8 : 8) + ((toIndex - 1) % 3) - 1;
        }

        if (fromIndex > 75) {
            // Chess.js does not support Chess.com drops in standard chess.
            continue;
        }

        moves.push({
            from: `${chessComMoveNotation[fromIndex % 8]}${Math.trunc(fromIndex / 8) + 1}` as Move["from"],
            to: `${chessComMoveNotation[toIndex % 8]}${Math.trunc(toIndex / 8) + 1}` as Move["to"],
            promotion
        });
    }

    return moves;
}

function getChessComGameTimeControl(game: ChessComCallbackGameResponse["game"]) {
    const timeControl = game.pgnHeaders?.TimeControl;

    if (!timeControl) {
        return TimeControl.CORRESPONDENCE;
    }

    if (timeControl.includes("/")) {
        return TimeControl.CORRESPONDENCE;
    }

    const baseSeconds = Number(timeControl);

    if (Number.isNaN(baseSeconds)) {
        return TimeControl.CORRESPONDENCE;
    }

    if (baseSeconds <= 180) return TimeControl.BULLET;
    if (baseSeconds <= 420) return TimeControl.BLITZ;
    if (baseSeconds <= 1800) return TimeControl.RAPID;

    return TimeControl.CLASSICAL;
}

function getChessComGameResults(game: ChessComCallbackGameResponse["game"]) {
    if (!game.isFinished) {
        return {
            white: GameResult.UNKNOWN,
            black: GameResult.UNKNOWN
        };
    }

    if (game.colorOfWinner == "white") {
        return {
            white: GameResult.WIN,
            black: GameResult.LOSE
        };
    }

    if (game.colorOfWinner == "black") {
        return {
            white: GameResult.LOSE,
            black: GameResult.WIN
        };
    }

    return {
        white: GameResult.DRAW,
        black: GameResult.DRAW
    };
}

function buildChessComPgn(game: ChessComCallbackGameResponse["game"]) {
    const parsedHeaders = game.pgnHeaders || {};
    const initialPosition = parsedHeaders.FEN || game.initialSetup || STARTING_FEN;
    const board = new Chess(initialPosition);

    for (const move of decodeChessComMoveList(game.moveList || "")) {
        try {
            board.move(move);
        } catch {
            break;
        }
    }

    const headerLines = Object.entries(parsedHeaders)
        .filter(([, value]) => value != undefined)
        .map(([key, value]) => `[${key} "${value}"]`)
        .join("\n");

    const pgn = board.pgn();

    return headerLines.length > 0
        ? `${headerLines}\n\n${pgn}`
        : pgn;
}

async function fetchChessComCallbackGame(
    gameType: ChessComGameType,
    gameId: string
): Promise<APIResponse<Game>> {
    const response = await fetch(
        `/api/public/chess-com/callback/${gameType}/game/${gameId}`
    );

    if (!response.ok) {
        return { status: response.status };
    }

    const payload = await response.json() as ChessComCallbackGameResponse;
    const game = payload.game;
    const results = getChessComGameResults(game);
    const pgnHeaders = game.pgnHeaders || {};
    const moveTimestampsMs = parseChessComMoveTimestamps(game);
    const clockBaseMs = game.timeControl?.baseMs || (game.baseTime1 ? game.baseTime1 * 100 : undefined);

    return {
        status: StatusCodes.OK,
        game: {
            pgn: buildChessComPgn(game),
            timeControl: getChessComGameTimeControl(game),
            variant: Variant.STANDARD,
            initialPosition: pgnHeaders.FEN || game.initialSetup || STARTING_FEN,
            source: {
                chessCom: {
                    gameId,
                    gameType,
                    gameUrl: buildChessComGameUrl(gameType, gameId),
                    clockBaseMs,
                    moveTimestampsMs
                }
            },
            players: {
                white: {
                    username: payload.players.bottom.username || pgnHeaders.White || "White",
                    rating: payload.players.bottom.rating || Number(pgnHeaders.WhiteElo),
                    image: payload.players.bottom.avatarUrl,
                    result: results.white
                },
                black: {
                    username: payload.players.top.username || pgnHeaders.Black || "Black",
                    rating: payload.players.top.rating || Number(pgnHeaders.BlackElo),
                    image: payload.players.top.avatarUrl,
                    result: results.black
                }
            },
            date: game.endTime
                ? new Date(game.endTime * 1000).toISOString()
                : game.startTime
                    ? new Date(game.startTime * 1000).toISOString()
                    : undefined
        }
    };
}

export async function getChessComGame(input: string): Promise<APIResponse<Game>> {
    const parsedSelection = parseChessComGameSelection(input);

    if (!parsedSelection) {
        return { status: StatusCodes.NOT_FOUND };
    }

    if (parsedSelection.gameType) {
        return await fetchChessComCallbackGame(parsedSelection.gameType, parsedSelection.gameId);
    }

    const liveGame = await fetchChessComCallbackGame("live", parsedSelection.gameId);
    if (liveGame.status == StatusCodes.OK) return liveGame;

    return await fetchChessComCallbackGame("daily", parsedSelection.gameId);
}

async function getChessComGames(
    username: string,
    month: number,
    year: number
): APIResponse<{ games: Game[] }> {
    const gamesResponse = await fetch(
        `https://api.chess.com/pub/player/${username}`
        + `/games/${year}/${padDateNumber(month)}`
    );

    if (gamesResponse.status == StatusCodes.NOT_FOUND) {
        try {
            const error = await gamesResponse.json();

            if (error.message == futureFetchError)
                return { status: StatusCodes.OK, games: [] };
        } catch {
            return { status: StatusCodes.INTERNAL_SERVER_ERROR };
        }
    } else if (!gamesResponse.ok) {
        return { status: gamesResponse.status };
    }

    const games: any[] | undefined = (await gamesResponse.json()).games;
    
    if (!games) return { status: StatusCodes.OK, games: [] };

    const parsedGames: Game[] = games
        .reverse()
        .filter(game => Object
            .keys(variantCodes)
            .includes(game.rules)
        )
        .map(game => ({
            pgn: game.pgn,
            timeControl: (
                timeControlCodes[game["time_class"]]
                || TimeControl.CORRESPONDENCE
            ),
            variant: variantCodes[game.rules] || Variant.STANDARD,
            initialPosition: game["initial_setup"] || STARTING_FEN,
            source: {
                chessCom: {
                    gameId: parseChessComGameSelection(game.url || "")?.gameId
                        || `${game.id}`,
                    gameType: parseChessComGameSelection(game.url || "")?.gameType
                        || (game["time_class"] == "daily" ? "daily" : "live"),
                    gameUrl: parseChessComGameSelection(game.url || "")?.gameUrl
                        || game.url
                        || (game.id ? buildChessComGameUrl(
                            game["time_class"] == "daily" ? "daily" : "live",
                            `${game.id}`
                        ) : undefined)
                }
            },
            players: {
                white: {
                    username: game.white.username,
                    rating: game.white.rating,
                    result: gameResultCodes[game.white.result] || GameResult.UNKNOWN
                },
                black: {
                    username: game.black.username,
                    rating: game.black.rating,
                    result: gameResultCodes[game.black.result] || GameResult.UNKNOWN
                }
            },
            date: new Date(game["end_time"] * 1000).toISOString()
        }));

    return {
        status: StatusCodes.OK,
        games: parsedGames
    };
}

export default getChessComGames;