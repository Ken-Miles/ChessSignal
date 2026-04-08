import { Chess } from "chess.js";
import { ParseTree, parseGame } from "@mliebelt/pgn-parser";
import { uniqueId } from "lodash-es";

import Game from "@/types/game/Game";
import { StateTreeNode } from "@/types/game/position/StateTreeNode";
import PieceColour from "@/constants/PieceColour";

type ParsedPGNMove = ParseTree["moves"][number];

function parseStateTree(game: Game) {
    const parsedPGN = parseGame(game.pgn);
    const chessComClockBaseMs = game.source?.chessCom?.clockBaseMs;
    const chessComMoveTimestampsMs = game.source?.chessCom?.moveTimestampsMs || [];

    function cloneClock(clock?: { whiteMs?: number; blackMs?: number }) {
        if (!clock) return undefined;

        return {
            whiteMs: clock.whiteMs,
            blackMs: clock.blackMs
        };
    }

    function addMovesToNode(
        node: StateTreeNode,
        moves: ParsedPGNMove[],
        mainline: boolean,
        clockState?: { whiteMs?: number; blackMs?: number }
    ) {
        let lastNode = node;
        let currentClock = cloneClock(clockState);

        for (const [moveIndex, pgnMove] of moves.entries()) {
            const branchClockState = cloneClock(currentClock);
            const move = new Chess(lastNode.state.fen)
                .move(pgnMove.notation.notation);

            const moveRemainingMs = chessComMoveTimestampsMs[moveIndex];
            const moverClockKey = move.color == "w" ? "whiteMs" : "blackMs";
            const previousRemainingMs = currentClock?.[moverClockKey];
            const moveSpentMs = previousRemainingMs != undefined && moveRemainingMs != undefined
                ? Math.max(0, previousRemainingMs - moveRemainingMs)
                : undefined;

            if (currentClock && moveRemainingMs != undefined) {
                currentClock[moverClockKey] = moveRemainingMs;
            }

            const newNode: StateTreeNode = {
                id: uniqueId(),
                mainline: mainline,
                parent: lastNode,
                children: [],
                state: {
                    fen: move.after,
                    engineLines: [],
                    move: {
                        san: move.san,
                        uci: move.lan,
                        clock: moveRemainingMs != undefined
                            ? {
                                spentMs: moveSpentMs,
                                remainingMs: moveRemainingMs
                            }
                            : undefined
                    },
                    moveColour: move.color == "w"
                        ? PieceColour.WHITE
                        : PieceColour.BLACK,
                    clock: cloneClock(currentClock)
                }
            };

            lastNode.children.push(newNode);

            for (const variation of pgnMove.variations) {
                addMovesToNode(lastNode, variation, false, branchClockState);
            }

            lastNode = newNode;
        }
    }

    const rootNode: StateTreeNode = {
        id: uniqueId(),
        mainline: true,
        children: [],
        state: {
            fen: game.initialPosition,
            engineLines: [],
            clock: chessComClockBaseMs != undefined
                ? {
                    whiteMs: chessComClockBaseMs,
                    blackMs: chessComClockBaseMs
                }
                : undefined
        }
    };

    addMovesToNode(rootNode, parsedPGN.moves, true, rootNode.state.clock);

    return rootNode;
}

export default parseStateTree;