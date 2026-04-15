import { Chess, KING, WHITE } from "chess.js";

import AnalysedGame from "shared/types/game/AnalysedGame";
import PieceColour from "shared/constants/PieceColour";
import { GameResult } from "shared/constants/game/GameResult";

type GameOutcomeNode = {
    state: {
        fen: string;
    };
    children?: GameOutcomeNode[];
};

export type GameOutcomeReason =
    | "checkmate"
    | "stalemate"
    | "insufficient material"
    | "threefold repetition"
    | "50-move rule"
    | "resignation"
    | "timeout"
    | "agreement"
    | "abandonment"
    | "time vs insufficient material";

export interface GameOutcomeMarker {
    square: string;
    label: string;
    tone: "winner" | "reason";
}

export interface GameOutcomeEffect {
    markers: GameOutcomeMarker[];
}

export interface GameOutcomeSummary {
    title: string;
    detail?: string;
    tone: "win" | "draw" | "lose" | "neutral";
    reason?: GameOutcomeReason;
    winnerColour?: PieceColour;
}

function getChessComEndReason(reason?: string): GameOutcomeReason | undefined {
    if (!reason) return undefined;

    const normalisedReason = reason.toLowerCase();

    if (normalisedReason.includes("checkmate")) return "checkmate";
    if (normalisedReason.includes("stalemate")) return "stalemate";
    if (normalisedReason.includes("insufficient")) return "insufficient material";
    if (normalisedReason.includes("50")) return "50-move rule";
    if (normalisedReason.includes("repetition")) return "threefold repetition";
    if (normalisedReason.includes("resign")) return "resignation";
    if (normalisedReason.includes("timeout")) return "timeout";
    if (normalisedReason.includes("agreed")) return "agreement";
    if (normalisedReason.includes("abandon")) return "abandonment";
    if (normalisedReason.includes("timevsinsufficient")) return "time vs insufficient material";

    return undefined;
}

function getPgnEndReason(pgn?: string): GameOutcomeReason | undefined {
    if (!pgn) return undefined;

    const terminationMatch = pgn.match(/\[Termination\s+"([^"]+)"\]/i);
    const terminationValue = terminationMatch?.[1]?.trim();

    return getChessComEndReason(terminationValue);
}

function getTerminalBoardReason(board: Chess): GameOutcomeReason | undefined {
    if (board.isCheckmate()) return "checkmate";
    if (board.isStalemate()) return "stalemate";
    if (board.isInsufficientMaterial()) return "insufficient material";
    if (board.isThreefoldRepetition()) return "threefold repetition";
    if (board.isDrawByFiftyMoves()) return "50-move rule";

    return undefined;
}

function getFinalNode(node: GameOutcomeNode): GameOutcomeNode {
    return node.children?.[0]
        ? getFinalNode(node.children[0])
        : node;
}

function getKingSquare(board: Chess, colour: "w" | "b") {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

    for (let rank = 1; rank <= 8; rank += 1) {
        for (const file of files) {
            const square = `${file}${rank}`;
            const piece = board.get(square as any);

            if (piece?.type == KING && piece.color == colour) {
                return square;
            }
        }
    }

    return undefined;
}

function getOutcomeContext(game: AnalysedGame) {
    const finalNode = getFinalNode(game.stateTree as GameOutcomeNode);
    const finalBoard = new Chess(finalNode?.state.fen || game.initialPosition);
    const sourceReason = getChessComEndReason(
        (game.source?.chessCom as { gameEndReason?: string } | undefined)?.gameEndReason
    );
    const pgnReason = getPgnEndReason(game.pgn);
    const boardReason = getTerminalBoardReason(finalBoard);
    const reason: GameOutcomeReason | undefined = sourceReason || pgnReason || boardReason;
    const whiteResult = getWhiteResult(game, finalBoard);

    return {
        finalBoard,
        reason,
        whiteResult
    };
}

function getWhiteResult(game: AnalysedGame, finalBoard?: Chess) {
    const result = game.players.white.result;

    if (result != GameResult.UNKNOWN) {
        return result;
    }

    if (!finalBoard) {
        const finalNode = getFinalNode(game.stateTree as GameOutcomeNode);
        finalBoard = new Chess(finalNode?.state.fen || game.initialPosition);
    }

    if (finalBoard.isCheckmate()) {
        return finalBoard.turn() == WHITE ? GameResult.LOSE : GameResult.WIN;
    }

    if (
        finalBoard.isStalemate()
        || finalBoard.isInsufficientMaterial()
        || finalBoard.isThreefoldRepetition()
        || finalBoard.isDrawByFiftyMoves()
    ) {
        return GameResult.DRAW;
    }

    return GameResult.UNKNOWN;
}

export function getGameOutcomeSummary(game: AnalysedGame): GameOutcomeSummary | undefined {
    const { reason, whiteResult } = getOutcomeContext(game);

    if (whiteResult == GameResult.UNKNOWN && !reason) {
        return undefined;
    }

    const winnerColour = whiteResult == GameResult.WIN
        ? PieceColour.WHITE
        : whiteResult == GameResult.LOSE
            ? PieceColour.BLACK
            : undefined;

    if (whiteResult == GameResult.DRAW) {
        return {
            title: "Draw",
            detail: reason ? `by ${reason}` : undefined,
            tone: "draw",
            reason
        };
    }

    if (whiteResult == GameResult.WIN) {
        return {
            title: "White won",
            detail: reason ? `by ${reason}` : undefined,
            tone: "win",
            reason,
            winnerColour
        };
    }

    if (whiteResult == GameResult.LOSE) {
        return {
            title: "Black won",
            detail: reason ? `by ${reason}` : undefined,
            tone: "lose",
            reason,
            winnerColour
        };
    }

    return {
        title: "Game complete",
        detail: reason ? `by ${reason}` : undefined,
        tone: "neutral",
        reason
    };
}

export function getGameOutcomeEffect(game: AnalysedGame): GameOutcomeEffect | undefined {
    const { finalBoard, reason, whiteResult } = getOutcomeContext(game);

    if (!reason || whiteResult == GameResult.DRAW || whiteResult == GameResult.UNKNOWN) {
        return undefined;
    }

    if (reason != "checkmate" && reason != "timeout") {
        return undefined;
    }

    const winnerColour = whiteResult == GameResult.WIN ? "w" : "b";
    const loserColour = whiteResult == GameResult.WIN ? "b" : "w";
    const winnerSquare = getKingSquare(finalBoard, winnerColour);
    const loserSquare = getKingSquare(finalBoard, loserColour);

    if (!winnerSquare || !loserSquare) {
        return undefined;
    }

    return {
        markers: [
            {
                square: winnerSquare,
                label: "Winner",
                tone: "winner"
            },
            {
                square: loserSquare,
                label: reason == "checkmate" ? "Checkmate" : "Timeout",
                tone: "reason"
            }
        ]
    };
}
