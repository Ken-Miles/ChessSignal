import React, { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { uniqWith } from "lodash-es";
import { Chess } from "chess.js";

import { getNodeParentChain } from "shared/types/game/position/StateTreeNode";
import { isEngineLineEqual } from "shared/types/game/position/EngineLine";
import PieceColour from "shared/constants/PieceColour";
import { parseUciMove } from "shared/lib/utils/chess";
import useRealtimeAnalyser from "@analysis/hooks/useRealtimeAnalyser";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useRealtimeEngineStore from "@analysis/stores/RealtimeEngineStore";
import RealtimeEngine from "@analysis/components/RealtimeEngine";
import type { MoveEvaluation } from "@analysis/lib/evaluateMovesParallel";

function upsertLiveBranchMove(
    node: any,
    moveEvaluation: MoveEvaluation
) {
    const existingNode = node.children.find(
        (child: any) => child.state.move?.uci == moveEvaluation.uciMove
    );

    if (existingNode) {
        existingNode.state.engineLines = uniqWith(
            existingNode.state.engineLines.concat(moveEvaluation.engineLines),
            isEngineLineEqual
        );

        return existingNode;
    }

    const parsedMove = parseUciMove(moveEvaluation.uciMove);

    let playedMove;

    try {
        playedMove = new Chess(node.state.fen).move(parsedMove);
    } catch {
        return node;
    }

    if (!playedMove) {
        return node;
    }

    const createdNode = {
        id: `${node.id}-${moveEvaluation.uciMove}`,
        mainline: false,
        parent: node,
        source: "engine",
        children: [],
        state: {
            fen: playedMove.after,
            engineLines: moveEvaluation.engineLines,
            move: {
                san: playedMove.san || moveEvaluation.sanMove,
                uci: playedMove.lan || moveEvaluation.uciMove
            },
            moveColour: playedMove.color == "w"
                ? PieceColour.WHITE
                : PieceColour.BLACK
        }
    };

    node.children.push(createdNode);

    return createdNode;
}

function RealtimeEngineArea() {
    const { settings } = useSettingsStore();

    const initialPosition = useAnalysisGameStore(
        state => state.analysisGame.initialPosition
    );

    const {
        currentStateTreeNode,
        currentStateTreeNodeUpdate,
        dispatchCurrentNodeUpdate
    } = useAnalysisBoardStore(
        useShallow(state => ({
            currentStateTreeNode: state.currentStateTreeNode,
            currentStateTreeNodeUpdate: state.currentStateTreeNodeUpdate,
            dispatchCurrentNodeUpdate: state.dispatchCurrentNodeUpdate
        }))
    );

    const setDisplayedEngineLines = useRealtimeEngineStore(
        state => state.setDisplayedEngineLines
    );

    const considerRealtimeAnalyse = useRealtimeAnalyser();

    const evaluationNode = currentStateTreeNode;

    const playedUciMoves = useMemo(() => (
        getNodeParentChain(currentStateTreeNode)
            .reverse()
            .filter(node => node.state.move)
            .map(node => node.state.move!.uci)
    ), [currentStateTreeNode]);

    const cachedEngineLines = currentStateTreeNode.state.engineLines;
    const shouldEvaluate = cachedEngineLines.length == 0;

    // Keep board consumers in sync with cached lines for the selected node.
    useEffect(() => {
        setDisplayedEngineLines(cachedEngineLines);
    }, [
        currentStateTreeNode,
        currentStateTreeNodeUpdate,
        cachedEngineLines,
        setDisplayedEngineLines
    ]);

    return <RealtimeEngine
        initialPosition={initialPosition}
        playedUciMoves={playedUciMoves}
        cachedEngineLines={cachedEngineLines}
        shouldEvaluate={shouldEvaluate}
        config={{
            ...settings.analysis.engine,
            depth: settings.analysis.engine.depth,
            timeLimit: settings.analysis.engine.timeLimitEnabled
                ? settings.analysis.engine.timeLimit
                : (
                    settings.analysis.engine.depth == undefined
                        ? 1
                        : undefined
                )
        }}
        onEngineLines={setDisplayedEngineLines}
        onMoveEvaluations={(moveEvaluations: MoveEvaluation[]) => {
            if (!moveEvaluations.length) return;

            for (const moveEvaluation of moveEvaluations) {
                upsertLiveBranchMove(evaluationNode, moveEvaluation);
            }

            dispatchCurrentNodeUpdate();
        }}
        onEvaluationComplete={lines => {
            evaluationNode.state.engineLines = uniqWith(
                evaluationNode.state.engineLines.concat(lines),
                isEngineLineEqual
            );

            // Force graph/report consumers to reflect the updated node evaluation.
            dispatchCurrentNodeUpdate();

            considerRealtimeAnalyse();
        }}
    />;
}

export default RealtimeEngineArea;  