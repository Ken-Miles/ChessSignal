import { useEffect, useState } from "react";

import { defaultEvaluation } from "shared/constants/utils";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useRealtimeEngineStore from "@analysis/stores/RealtimeEngineStore";

function useEvaluation() {
    const gameAnalysisOpen = useAnalysisGameStore(
        state => state.gameAnalysisOpen
    );
    const currentStateTreeNode = useAnalysisBoardStore(
        state => state.currentStateTreeNode
    );

    const { displayedEngineLines } = useRealtimeEngineStore();

    const [ evaluation, setEvaluation ] = useState(defaultEvaluation);

    useEffect(() => {
        const selectedNodeEvaluation = getTopEngineLine(
            currentStateTreeNode.state.engineLines
        )?.evaluation;

        if (selectedNodeEvaluation) {
            return setEvaluation(selectedNodeEvaluation);
        }

        const evaluation = displayedEngineLines.at(0)?.evaluation;

        if (evaluation) return setEvaluation(evaluation);

        if (!gameAnalysisOpen) setEvaluation(defaultEvaluation);
    }, [currentStateTreeNode, displayedEngineLines, gameAnalysisOpen]);

    return evaluation;
}

export default useEvaluation;