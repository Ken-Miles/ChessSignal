import React, { useMemo } from "react";
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
        currentEngineLines
    } = useAnalysisBoardStore(
        useShallow(state => ({
            currentStateTreeNode: state.currentStateTreeNode,
            currentEngineLines: state.currentStateTreeNode.state.engineLines
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

    return <RealtimeEngine
        initialPosition={initialPosition}
        playedUciMoves={playedUciMoves}
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
        cachedEngineLines={currentEngineLines}
        onEngineLines={setDisplayedEngineLines}
        onEvaluationComplete={lines => {
            currentStateTreeNode.state.engineLines = uniqWith(
                currentStateTreeNode.state.engineLines.concat(lines),
                isEngineLineEqual
            );

            considerRealtimeAnalyse();
        }}
    />;
}

export default RealtimeEngineArea;