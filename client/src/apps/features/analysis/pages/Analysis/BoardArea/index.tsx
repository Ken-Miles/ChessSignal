import React, { useMemo } from "react";
import { Move } from "chess.js";

import { addChildMove } from "shared/types/game/position/StateTreeNode";
import { StateTreeNode } from "shared/types/game/position/StateTreeNode";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisTabStore from "@analysis/stores/AnalysisTabStore";
import Board from "@analysis/components/Board";
import playBoardSound from "@/lib/boardSounds";
import AnalysisTab from "@analysis/constants/AnalysisTab";
import { getGameOutcomeEffect } from "@analysis/lib/gameOutcome";

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

    const activeTab = useAnalysisTabStore(state => state.activeTab);

    const {
        currentStateTreeNode,
        setCurrentStateTreeNode,
        dispatchCurrentNodeUpdate,
        autoplayEnabled,
        boardFlipped
    } = useAnalysisBoardStore();

    const evaluation = useEvaluation();
    const suggestionArrows = useSuggestionArrows();
    const isChessComGame = analysisGame.source?.chessCom != undefined;
    const whiteProfileUrl = isChessComGame && analysisGame.players.white.username
        ? `https://www.chess.com/member/${encodeURIComponent(analysisGame.players.white.username)}`
        : undefined;
    const blackProfileUrl = isChessComGame && analysisGame.players.black.username
        ? `https://www.chess.com/member/${encodeURIComponent(analysisGame.players.black.username)}`
        : undefined;

    const boardStyle = useMemo(() => ({
        maxWidth: `calc(100vh - ${evaluation ? 195 : 235}px)`
    }), [evaluation]);

    const boardTheme = useMemo(() => ({
        lightSquareColour: theme.board.lightSquareColour,
        darkSquareColour: theme.board.darkSquareColour,
        boardTexture: theme.board.texture,
        pieceSet: theme.piece,
        preset: theme.preset,
        coordinatesPlacement: theme.board.coordinatesPlacement
    }), [
        theme.board.lightSquareColour,
        theme.board.darkSquareColour,
        theme.board.texture,
        theme.piece,
        theme.preset,
        theme.board.coordinatesPlacement
    ]);

    const outcomeEffect = useMemo(() => (
        activeTab == AnalysisTab.REPORT
            ? getGameOutcomeEffect(analysisGame)
            : undefined
    ), [activeTab, analysisGame]);

    function addMove(move: Move) {
        if (!gameAnalysisOpen) {
            setGameAnalysisOpen(true);
        }

        setCurrentStateTreeNode((prev: StateTreeNode) => {
            const createdNode = addChildMove(prev, move.san);
            playBoardSound(createdNode);

            return createdNode;
        });

        dispatchCurrentNodeUpdate();

        return true;
    }

    return <Board
        className={styles.board}
        style={boardStyle}
        profileClassName={styles.boardProfile}
        whiteProfile={analysisGame.players.white}
        blackProfile={analysisGame.players.black}
        whiteProfileUrl={whiteProfileUrl}
        blackProfileUrl={blackProfileUrl}
        showPlayerClocks={analysisGame.timeControl != undefined}
        theme={boardTheme}
        liveClockRealtime={analysisGame.source?.chessCom?.isLiveOngoing == true}
        node={currentStateTreeNode}
        flipped={boardFlipped}
        evaluation={evaluation}
        arrows={suggestionArrows}
        outcomeEffect={outcomeEffect}
        piecesDraggable={!autoplayEnabled}
        enableClassifications={!settings.classifications.hide}
        onAddMove={addMove}
    />;
}

export default BoardArea;