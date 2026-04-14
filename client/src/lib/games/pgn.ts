import { validateFen } from "chess.js";
import { parseGame } from "@mliebelt/pgn-parser";

import Game from "shared/types/game/Game";
import { GameResult } from "shared/constants/game/GameResult";
import { PieceColour } from "shared/constants/PieceColour";
import TimeControl from "shared/constants/game/TimeControl";
import Variant from "shared/constants/game/Variant";
import { STARTING_FEN } from "shared/constants/utils";

type ParsedPgnMove = ReturnType<typeof parseGame>["moves"][number] & {
    commentDiag?: { clk?: string };
    commentMove?: string;
    commentAfter?: string;
};

function parseClockValue(clock?: string) {
    const trimmedClock = clock?.trim();

    if (!trimmedClock) return undefined;

    const segments = trimmedClock.split(":");
    const seconds = Number(segments.pop());

    if (Number.isNaN(seconds)) return undefined;

    let totalSeconds = seconds;

    if (segments.length > 0) {
        const minutes = Number(segments.pop());
        if (Number.isNaN(minutes)) return undefined;

        totalSeconds += minutes * 60;
    }

    if (segments.length > 0) {
        const hours = Number(segments.pop());
        if (Number.isNaN(hours)) return undefined;

        totalSeconds += hours * 3600;
    }

    return Math.round(totalSeconds * 1000);
}

function parseTimeControl(timeControl?: string) {
    if (!timeControl) return undefined;

    if (timeControl.includes("/")) {
        return TimeControl.CORRESPONDENCE;
    }

    const baseSeconds = Number(timeControl.split("+")[0]);

    if (Number.isNaN(baseSeconds)) {
        return undefined;
    }

    if (baseSeconds <= 180) return TimeControl.BULLET;
    if (baseSeconds <= 420) return TimeControl.BLITZ;
    if (baseSeconds <= 1800) return TimeControl.RAPID;

    return TimeControl.CLASSICAL;
}

function parseClockBaseMs(timeControl?: string) {
    if (!timeControl || timeControl.includes("/")) {
        return undefined;
    }

    const baseSeconds = Number(timeControl.split("+")[0]);

    if (Number.isNaN(baseSeconds)) {
        return undefined;
    }

    return baseSeconds * 1000;
}

function getMoveClockValue(move: ParsedPgnMove) {
    if (move.commentDiag?.clk) {
        return move.commentDiag.clk;
    }

    const commentText = [move.commentMove, move.commentAfter]
        .filter((value): value is string => typeof value == "string")
        .join(" ");

    const clockMatch = commentText.match(/\[%clk\s+([^\]]+)\]/i);

    return clockMatch?.[1];
}

function getMoveTimestampsMs(moves: ParsedPgnMove[]) {
    return moves
        .map(move => parseClockValue(getMoveClockValue(move)))
        .filter((value): value is number => value != undefined);
}

function parseResultString(result: string, colour: PieceColour) {
    if (result == "1/2-1/2") return GameResult.DRAW;
    if (result == "*") return GameResult.UNKNOWN;

    const winningResult = colour == PieceColour.WHITE ? "1-0" : "0-1";

    return result == winningResult ? GameResult.WIN : GameResult.LOSE;
}

function parsePgn(pgn: string): Game {
    const sanitisedPGN = pgn.replace(/("])\n(\d+\.)/, "$1\n\n$2");

    const game = parseGame(sanitisedPGN);
    const headers = game.tags as any;
    const timeControlHeader = headers["TimeControl"] as string | undefined;
    const moveTimestampsMs = getMoveTimestampsMs(game.moves as ParsedPgnMove[]);
    const clockBaseMs = parseClockBaseMs(timeControlHeader);

    const variant = headers["Variant"] == "Chess960"
        ? Variant.CHESS960 : Variant.STANDARD;
    const timeControl = parseTimeControl(timeControlHeader)
        || (moveTimestampsMs.length > 0 ? TimeControl.CORRESPONDENCE : undefined);

    const initialPosition = (headers["FEN"] && validateFen(headers["FEN"]).ok)
        ? headers["FEN"] : STARTING_FEN;

    const ratings = {
        white: parseInt(headers["WhiteElo"] || ""),
        black: parseInt(headers["BlackElo"] || "")
    };

    return {
        pgn: sanitisedPGN,
        timeControl,
        players: {
            white: {
                username: headers["White"] || "White",
                title: headers["WhiteTitle"],
                rating: isNaN(ratings.white) ? undefined : ratings.white,
                image: headers["WhiteUrl"],
                result: parseResultString(
                    headers["Result"],
                    PieceColour.WHITE
                )
            },
            black: {
                username: headers["Black"] || "Black",
                title: headers["BlackTitle"],
                rating: isNaN(ratings.black) ? undefined : ratings.black,
                image: headers["BlackUrl"],
                result: parseResultString(
                    headers["Result"],
                    PieceColour.BLACK
                )
            }
        },
        source: (clockBaseMs != undefined || moveTimestampsMs.length > 0)
            ? {
                chessCom: {
                    clockBaseMs,
                    moveTimestampsMs
                }
            }
            : undefined,
        variant,
        initialPosition
    };
}

export default parsePgn;
