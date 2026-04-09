import { Chess } from "chess.js";
import { components } from "@lichess-org/types";

import { EngineLine } from "shared/types/game/position/EngineLine";
import Move from "shared/types/game/position/Move";
import EngineVersion from "shared/constants/EngineVersion";
import { lichessCastlingMoves } from "shared/constants/utils";

type CloudEvaluation = components["schemas"]["CloudEval"];
const DISABLE_CLOUD_EVALUATION = true;
const CLOUD_EVAL_TIMEOUT_MS = 2500;
const CLOUD_TIMEOUT_BACKOFF_INITIAL_MS = 5000;
const CLOUD_TIMEOUT_BACKOFF_MAX_MS = 60000;
const unavailableCloudEvalFens = new Set<string>();
let cloudBackoffUntilMs = 0;
let cloudBackoffMs = CLOUD_TIMEOUT_BACKOFF_INITIAL_MS;

async function getCloudEvaluation(
    fen: string,
    targetCount = 1
): Promise<EngineLine[] | null> {
    if (DISABLE_CLOUD_EVALUATION) {
        return [];
    }

    if (unavailableCloudEvalFens.has(fen)) {
        return null;
    }

    if (Date.now() < cloudBackoffUntilMs) {
        return [];
    }

    const queryParams = new URLSearchParams({
        fen,
        multiPv: targetCount.toString()
    });

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
        abortController.abort();
    }, CLOUD_EVAL_TIMEOUT_MS);

    let cloudResponse: Response;

    try {
        cloudResponse = await fetch(
            `https://lichess.org/api/cloud-eval?${queryParams.toString()}`,
            { signal: abortController.signal }
        );
    } catch (error) {
        // Network/CORS failures should not block local evaluation fallback.
        window.clearTimeout(timeoutId);

        if ((error as DOMException).name == "AbortError") {
            cloudBackoffUntilMs = Date.now() + cloudBackoffMs;
            cloudBackoffMs = Math.min(
                cloudBackoffMs * 2,
                CLOUD_TIMEOUT_BACKOFF_MAX_MS
            );
        }

        return [];
    }

    window.clearTimeout(timeoutId);
    cloudBackoffMs = CLOUD_TIMEOUT_BACKOFF_INITIAL_MS;
    cloudBackoffUntilMs = 0;

    if (!cloudResponse.ok) {
        if (cloudResponse.status == 404) {
            // Only disable cloud eval for this exact position.
            unavailableCloudEvalFens.add(fen);
            return null;
        }

        // Non-200 responses (for example 429) should not fail the full run.
        return [];
    }

    let cloudEvaluation: CloudEvaluation;

    try {
        cloudEvaluation = await cloudResponse.json();
    } catch {
        return [];
    }

    if (!cloudEvaluation.pvs?.length) {
        return [];
    }

    const engineLines: EngineLine[] = [];

    for (const variation of cloudEvaluation.pvs) {
        if (typeof variation.moves != "string") {
            continue;
        }

        const variationBoard = new Chess(fen);

        const lineMoves: Move[] = [];

        for (const lichessUciMove of variation.moves.split(" ")) {
            const uciMove = lichessCastlingMoves[lichessUciMove]
                || lichessUciMove;

            try {
                const parsedMove = variationBoard.move(uciMove);

                lineMoves.push({
                    san: parsedMove.san,
                    uci: parsedMove.lan
                });
            } catch {
                break;
            }
        }

        engineLines.push({
            evaluation: {
                type: ("mate" in variation) ? "mate" : "centipawn",
                value: ("mate" in variation) ? variation.mate : variation.cp
            },
            source: EngineVersion.LICHESS_CLOUD,
            depth: cloudEvaluation.depth,
            index: cloudEvaluation.pvs.indexOf(variation) + 1,
            moves: lineMoves
        });
    }

    return engineLines;
}

export default getCloudEvaluation;