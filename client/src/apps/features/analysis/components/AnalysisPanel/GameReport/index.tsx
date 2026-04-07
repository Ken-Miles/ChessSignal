import React from "react";

import { getGameAccuracy } from "shared/lib/reporter/accuracy";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import Button from "@/components/common/Button";

import EvaluationGraphArea from "./EvaluationGraphArea";
import GameOverviewCard from "./GameOverviewCard";
import * as styles from "./GameReport.module.css";

interface GameReportProps {
    onStartReview?: () => void;
}

function GameReport({ onStartReview }: GameReportProps) {
    const analysisGame = useAnalysisGameStore(state => state.analysisGame);

    useAnalysisBoardStore(state => state.currentStateTreeNodeUpdate);

    const accuracies = getGameAccuracy(analysisGame.stateTree);
    
    return <div className={styles.overviewContainer}>
        <EvaluationGraphArea/>

        <GameOverviewCard
            analysisGame={analysisGame}
            accuracies={accuracies}
        />

        <Button
            className={styles.startReviewButton}
            onClick={onStartReview}
        >
            Start Review
        </Button>
    </div>;
}

export default GameReport;