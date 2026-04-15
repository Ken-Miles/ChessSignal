import React, { lazy, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AnalysisTab from "@analysis/constants/AnalysisTab";
import { GameSource } from "@/components/chess/GameSelector/GameSource";
import { withChessComLookupUsername } from "@/lib/games/chessCom";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisTabStore from "@analysis/stores/AnalysisTabStore";
import ClassifiedMoveCard from "@analysis/components/report/ClassifiedMoveCard";
import StateTreeTraverser from "@/components/chess/StateTreeTraverser";
import {
    analysisSelectionUrlKeys,
    getAnalysisMovePlyFromUrl,
    updateAnalysisMoveUrl,
    updateAnalysisSelectionUrl
} from "@analysis/lib/selectionUrl";

import AnalysisProgress from "./AnalysisProgress";
import RealtimeEngineArea from "./RealtimeEngineArea";

import GameSelection from "./GameSelection";
import GameReport from "./GameReport";
import GameAnalysis from "./GameAnalysis";
import EvaluationGraphArea from "./GameReport/EvaluationGraphArea";

import AnalysisPanelProps from "./AnalysisPanelProps";
import * as styles from "./AnalysisPanel.module.css";

const OptionsToolbar = lazy(() => import("@analysis/components/OptionsToolbar"));

function getNodePly(node: { parent?: unknown }) {
    let ply = 0;
    let current = node;

    while (current?.parent) {
        ply++;
        current = current.parent as { parent?: unknown };
    }

    return ply;
}

function AnalysisPanel({
    className,
    style
}: AnalysisPanelProps) {
    const { t } = useTranslation("analysis");
    const [ searchParams, setSearchParams ] = useSearchParams();

    const settings = useSettingsStore(state => state.settings.analysis);

    const gameAnalysisOpen = useAnalysisGameStore(
        state => state.gameAnalysisOpen
    );

    const currentNode = useAnalysisBoardStore(
        state => state.currentStateTreeNode
    );

    useEffect(() => {
        if (!gameAnalysisOpen) return;

        const currentMovePly = getNodePly(currentNode);
        const movePlyFromUrl = getAnalysisMovePlyFromUrl(searchParams);

        if (movePlyFromUrl == currentMovePly) return;

        setSearchParams(updateAnalysisMoveUrl(searchParams, currentMovePly));
    }, [
        currentNode.id,
        gameAnalysisOpen,
        searchParams,
        setSearchParams
    ]);

    const { activeTab, setActiveTab } = useAnalysisTabStore();

    const handleStartReview = () => {
        const chessComSource = useAnalysisGameStore.getState().analysisGame.source?.chessCom;
        const chessComPlayers = useAnalysisGameStore.getState().analysisGame.players;

        if (chessComSource?.liveGameId && !chessComSource.isLiveOngoing && chessComSource.gameUrl) {
            setSearchParams(updateAnalysisSelectionUrl(searchParams, {
                sourceKey: GameSource.CHESS_COM.key,
                fieldInput: withChessComLookupUsername(
                    chessComSource.gameUrl,
                    chessComPlayers?.white.username || chessComPlayers?.black.username
                ),
                perspective: (searchParams.get(analysisSelectionUrlKeys.perspective) as "white" | "black" | "auto" | null) || undefined
            }));

            return;
        }

        setActiveTab(AnalysisTab.ANALYSIS);
    };
    
    return <div
        className={`${styles.wrapper} ${className}`}
        style={style}
    >
        <div className={styles.components}>
            <div className={styles.sidebarHeader}>
                <div className={styles.sidebarHeaderCenter}>
                    <span className={styles.sidebarHeaderIcon}>★</span>

                    <h1 className={styles.title}>
                        {t("title")}
                    </h1>
                </div>

                <div className={styles.sidebarHeaderActions}>
                    <button
                        type="button"
                        className={styles.sidebarHeaderButtonSecondary}
                        aria-label="Toggle Coach Audio"
                    >
                        🔊
                    </button>

                    <button
                        type="button"
                        className={styles.sidebarHeaderButton}
                        aria-label="Go to Analysis"
                    >
                        🔎
                    </button>
                </div>
            </div>

            <OptionsToolbar/>

            {gameAnalysisOpen && <div className={styles.tabBar}>
                <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab == AnalysisTab.REPORT ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab(AnalysisTab.REPORT)}
                >
                    Overview
                </button>

                <button
                    type="button"
                    className={`${styles.tabButton} ${activeTab == AnalysisTab.ANALYSIS ? styles.tabButtonActive : ""}`}
                    onClick={() => setActiveTab(AnalysisTab.ANALYSIS)}
                >
                    Moves
                </button>
            </div>}

            <AnalysisProgress/>

            {(gameAnalysisOpen
                && activeTab == AnalysisTab.ANALYSIS
                && settings.engine.enabled)
                && <RealtimeEngineArea/>
            }

            {gameAnalysisOpen
                && currentNode.state.move
                && (
                    settings.engine.enabled
                    || currentNode.state.classification
                )
                && <ClassifiedMoveCard/>
            }

            {gameAnalysisOpen
                ? (activeTab == AnalysisTab.REPORT
                    ? <div className={styles.reviewLayout}>
                        <div className={styles.reportSection}>
                            <GameReport
                                onStartReview={handleStartReview}
                            />
                        </div>
                    </div>
                    : <div className={styles.movesView}>
                        <div className={styles.moveListSection}>
                            <GameAnalysis/>
                        </div>

                        <EvaluationGraphArea/>
                    </div>
                )
                : <GameSelection/>
            }
        </div>

        <div
            className={styles.traverserContainer}
            style={{
                display: (
                    gameAnalysisOpen
                    && activeTab == AnalysisTab.ANALYSIS
                ) ? undefined : "none"
            }}
        >
            <StateTreeTraverser className={styles.traverser} />
        </div>
    </div>;
}

export default AnalysisPanel;