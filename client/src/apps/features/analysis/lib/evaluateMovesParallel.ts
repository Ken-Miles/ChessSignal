import { Chess } from "chess.js";
import { EngineLine } from "shared/types/game/position/EngineLine";
import EngineVersion from "shared/constants/EngineVersion";
import Engine from "./engine";

export interface MoveEvaluation {
    uciMove: string;
    sanMove: string;
    engineLines: EngineLine[];
}

interface EvaluateMovesParallelOptions {
    initialPosition: string;
    playedUciMoves?: string[];
    engineVersion: EngineVersion;
    depth?: number;
    timeLimit?: number;
    lines?: number;
    onMoveEvaluation?: (moveEval: MoveEvaluation) => void;
    signal?: AbortSignal;
}

export async function evaluateMovesParallel(
    options: EvaluateMovesParallelOptions
): Promise<MoveEvaluation[]> {
    const {
        initialPosition,
        playedUciMoves,
        engineVersion,
        depth,
        timeLimit,
        lines = 1,
        onMoveEvaluation,
        signal
    } = options;

    // Get current position
    const board = new Chess(initialPosition);
    if (playedUciMoves) {
        for (const uciMove of playedUciMoves) {
            try {
                board.move(uciMove);
            } catch {
                return [];
            }
        }
    }

    const currentPosition = board.fen();
    const legalMoves = board.moves({ verbose: true });

    // Evaluate all moves in parallel
    const moveEvaluationPromises = legalMoves.map(async (move) => {
        if (signal?.aborted) throw new Error("Evaluation aborted");

        try {
            const moveEngine = new Engine(engineVersion);

            // Create position after the move
            const moveBoardCopy = new Chess(currentPosition);
            const moveResult = moveBoardCopy.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion
            });

            if (!moveResult) {
                return null;
            }

            const movePosition = moveBoardCopy.fen();

            // Setup and evaluate from the position after the move
            moveEngine.setPosition(movePosition, []);
            moveEngine.setLineCount(lines);

            const engineLines: EngineLine[] = [];

            await moveEngine.evaluate({
                depth,
                timeLimit: timeLimit ? timeLimit * 1000 : undefined,
                onEngineLine: (line) => {
                    engineLines.push(line);
                }
            });

            moveEngine.terminate();

            // Derive UCI format: from + to + optional promotion
            const uciMove = `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`;

            const moveEvaluation: MoveEvaluation = {
                uciMove,
                sanMove: moveResult.san,
                engineLines
            };

            onMoveEvaluation?.(moveEvaluation);

            return moveEvaluation;
        } catch (error) {
            if (signal?.aborted) throw error;
            console.error(`Failed to evaluate move ${move.san}:`, error);
            return null;
        }
    });

    try {
        const results = await Promise.allSettled(moveEvaluationPromises);
        return results
            .filter((result) => result.status === "fulfilled" && result.value !== null)
            .map((result) => (result as PromiseFulfilledResult<MoveEvaluation>).value);
    } catch (error) {
        if (!signal?.aborted) {
            console.error("Move evaluation failed:", error);
        }
        return [];
    }
}
