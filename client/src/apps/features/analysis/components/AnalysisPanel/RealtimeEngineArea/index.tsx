import React, { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { uniqWith } from "lodash-es";

import { getNodeParentChain } from "shared/types/game/position/StateTreeNode";
import { isEngineLineEqual } from "shared/types/game/position/EngineLine";
import useRealtimeAnalyser from "@analysis/hooks/useRealtimeAnalyser";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useRealtimeEngineStore from "@analysis/stores/RealtimeEngineStore";
import RealtimeEngine from "@analysis/components/RealtimeEngine";

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
        onEvaluationComplete={lines => {
            currentStateTreeNode.state.engineLines = uniqWith(
                currentStateTreeNode.state.engineLines.concat(lines),
                isEngineLineEqual
            );

            // Force graph/report consumers to reflect the updated node evaluation.
            dispatchCurrentNodeUpdate();

            considerRealtimeAnalyse();
        }}
    />;
}

export default RealtimeEngineArea;