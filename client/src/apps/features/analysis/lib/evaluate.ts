import { sum, round } from "lodash-es";

import AnalysedGame from "shared/types/game/AnalysedGame";
import EngineVersion from "shared/constants/EngineVersion";
import { StateTreeNode, getNodeChain } from "shared/types/game/position/StateTreeNode";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import Engine from "@analysis/lib/engine";
import getCloudEvaluation from "./cloudEvaluate";

interface EvaluateMovesOptions {
    engineVersion: EngineVersion;
    maxEngineCount?: number;
    engineDepth?: number;
    engineTimeLimit?: number;
    cloudEngineLines: number;
    engineConfig?: (engine: Engine) => void;
    onProgress?: (progress: number) => void;
    verbose?: boolean;
}

interface EvaluationProcess {
    evaluate: () => Promise<StateTreeNode[]>;
    controller: AbortController;
}

function createGameEvaluator(
    game: AnalysedGame,
    options: EvaluateMovesOptions
): EvaluationProcess {
    const controller = new AbortController();

    const stateTreeNodes = getNodeChain(game.stateTree);
    const evaluationTargetIndexes = stateTreeNodes
        .map((node, index) => ({ node, index }))
        .filter(({ node }) => node.state.engineLines.length == 0)
        .map(({ index }) => index);

    // Each state tree node keeps a progress from 0 to 1
    const progresses: number[] = [];

    function getProgress() {
        return round(sum(progresses) / stateTreeNodes.length, 3);
    }

    async function evaluator(): Promise<StateTreeNode[]> {
        // Mark already-evaluated nodes complete for progress tracking.
        for (const index of stateTreeNodes.keys()) {
            if (evaluationTargetIndexes.includes(index)) continue;

            progresses[index] = 1;
        }
        options.onProgress?.(getProgress());

        // Apply cloud evaluations until the first non-qualifying response.
        let cloudEvaluatedCount = 0;

        for (const index of evaluationTargetIndexes) {
            if (controller.signal.aborted) break;

            const stateTreeNode = stateTreeNodes[index];

            let cloudEngineLines;

            try {
                cloudEngineLines = await getCloudEvaluation(
                    stateTreeNode.state.fen,
                    options.cloudEngineLines
                );
            } catch {
                break;
            }

            if (cloudEngineLines == null) {
                break;
            }

            const topCloudLine = getTopEngineLine(cloudEngineLines);
            if (!topCloudLine) {
                break;
            }

            if (
                options.engineDepth != undefined
                && topCloudLine.depth < options.engineDepth
            ) {
                break;
            }

            if (cloudEngineLines.length < options.cloudEngineLines) {
                break;
            }

            stateTreeNode.state.engineLines = [
                ...stateTreeNode.state.engineLines,
                ...cloudEngineLines
            ];

            progresses[index] = 1;
            options.onProgress?.(getProgress());
            cloudEvaluatedCount++;
        }

        // Locally evaluate remaining positions from the cloud cutoff onward.
        const localStartCursor = Math.max(cloudEvaluatedCount - 1, 0);
        const localEvaluationIndexes = evaluationTargetIndexes.slice(localStartCursor);

        if (localEvaluationIndexes.length == 0) {
            return stateTreeNodes;
        }

        const engineCount = Math.min(
            options.maxEngineCount || 1,
            localEvaluationIndexes.length
        );

        let enginesResting = 0;
        let localEvaluationCursor = 0;

        return await new Promise((res, rej) => {
            // Bring an engine to a new FEN
            function evaluateNextPosition(engine: Engine) {
                const currentStateTreeNodeIndex = localEvaluationIndexes[localEvaluationCursor];

                if (currentStateTreeNodeIndex == undefined) {
                    engine.terminate();

                    if (++enginesResting == engineCount)
                        res(stateTreeNodes);

                    return;
                }

                const currentStateTreeNode = stateTreeNodes[currentStateTreeNodeIndex];

                engine.setPosition(game.initialPosition, stateTreeNodes
                    .slice(0, currentStateTreeNodeIndex + 1)
                    .filter(node => node.state.move)
                    .map(node => node.state.move!.uci)
                );

                engine.evaluate({
                    depth: options.engineDepth,
                    timeLimit: options.engineTimeLimit
                        ? options.engineTimeLimit * 1000
                        : undefined,
                    onEngineLine: line => {
                        // Depth 0 is given for states with no legal moves.
                        // For time-based analysis without a target depth,
                        // progress is marked complete only when evaluation ends.
                        const localProgress = (
                            line.depth == 0
                            || options.engineDepth == undefined
                        ) ? 1 : line.depth / options.engineDepth;
                        
                        // Progress value will already exist for cutoff node
                        progresses[currentStateTreeNodeIndex] = Math.max(
                            progresses[currentStateTreeNodeIndex] || 0,
                            localProgress
                        );

                        options.onProgress?.(getProgress());
                    }
                }).then(lines => {
                    progresses[currentStateTreeNodeIndex] = 1;

                    currentStateTreeNode.state.engineLines = [
                        ...currentStateTreeNode.state.engineLines,
                        ...lines
                    ];

                    evaluateNextPosition(engine);
                });

                localEvaluationCursor++;
            }

            // Start engines on first positions
            const engines: Engine[] = [];

            for (let i = 0; i < engineCount; i++) {
                const engine = new Engine(options.engineVersion);
                engines.push(engine);

                options.engineConfig?.(engine);

                if (options.verbose) {
                    engine.onMessage(console.log);
                }

                engine.onError(rej);

                evaluateNextPosition(engine);
            }

            controller.signal.addEventListener("abort", () => {
                engines.forEach(engine => engine.terminate());
                rej("abort");
            });
        });
    }

    return { evaluate: evaluator, controller };
}

export default createGameEvaluator;