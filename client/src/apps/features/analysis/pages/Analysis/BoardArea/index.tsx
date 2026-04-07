import React from "react";
import { Move } from "chess.js";

import { addChildMove } from "shared/types/game/position/StateTreeNode";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import Board from "@analysis/components/Board";
import playBoardSound from "@/lib/boardSounds";

import useEvaluation from "./useEvaluation";
import useSuggestionArrows from "./useSuggestionArrows";
import * as styles from "./BoardArea.module.css";

function BoardArea() {
    const settings = useSettingsStore(state => state.settings.analysis);
    const theme = useSettingsStore(state => state.settings.themes);

    const {
        analysisGame,
        gameAnalysisOpen,
        setGameAnalysisOpen
    } = useAnalysisGameStore();

    const {
        currentStateTreeNode,
        setCurrentStateTreeNode,
        dispatchCurrentNodeUpdate,
        autoplayEnabled,
        boardFlipped
    } = useAnalysisBoardStore();

    const evaluation = useEvaluation();
    const suggestionArrows = useSuggestionArrows();

    function addMove(move: Move) {
        if (!gameAnalysisOpen) {
            setGameAnalysisOpen(true);
        }

        setCurrentStateTreeNode(prev => {
            const createdNode = addChildMove(prev, move.san);
            playBoardSound(createdNode);

            return createdNode;
        });

        dispatchCurrentNodeUpdate();

        return true;
    }

    return <Board
        className={styles.board}
        style={{
            maxWidth: `calc(100vh - ${evaluation ? 195 : 235}px)`
        }}
        profileClassName={styles.boardProfile}
        whiteProfile={analysisGame.players.white}
        blackProfile={analysisGame.players.black}
        theme={{
            lightSquareColour: theme.board.lightSquareColour,
            darkSquareColour: theme.board.darkSquareColour
        }}
        node={currentStateTreeNode}
        flipped={boardFlipped}
        evaluation={evaluation}
        arrows={suggestionArrows}
        piecesDraggable={!autoplayEnabled}
        enableClassifications={!settings.classifications.hide}
        onAddMove={addMove}
    />;
}

export default BoardArea;