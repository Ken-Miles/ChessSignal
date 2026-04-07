import React from "react";

import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import playBoardSound from "@/lib/boardSounds";

import MainlineMoveList from "./MainlineMoveList";
import * as styles from "./GameAnalysis.module.css";

function GameAnalysis() {
    const { analysisGame } = useAnalysisGameStore();

    const {
        currentStateTreeNode,
        setCurrentStateTreeNode,
        setAutoplayEnabled
    } = useAnalysisBoardStore();
    
    return <MainlineMoveList
        className={styles.stateTreeEditor}
        stateTreeRootNode={analysisGame.stateTree}
        selectedNodeId={currentStateTreeNode.id}
        onMoveClick={node => {
            setCurrentStateTreeNode(node);
        
            if (node != currentStateTreeNode) {
                playBoardSound(node);
            }

            setAutoplayEnabled(false);
        }}
    />;
}

export default GameAnalysis;