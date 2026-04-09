import { useTranslation } from "react-i18next";

import AnalysedGame from "shared/types/game/AnalysedGame";
import AnalysisStatus from "@analysis/constants/AnalysisStatus";
import AnalysisTab from "@analysis/constants/AnalysisTab";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisProgressStore from "@analysis/stores/AnalysisProgressStore";
import useAnalysisTabStore from "@analysis/stores/AnalysisTabStore";
import createGameEvaluator from "../lib/evaluate";

function useEvaluateGame() {
    const { t } = useTranslation("analysis");

    const settings = useSettingsStore(
        state => state.settings.analysis.engine
    );

    const dispatchCurrentNodeUpdate = useAnalysisBoardStore(
        state => state.dispatchCurrentNodeUpdate
    );

    const {
        setAnalysisStatus,
        setEvaluationProgress,
        setAnalysisError
    } = useAnalysisProgressStore();

    const setActiveTab = useAnalysisTabStore(
        state => state.setActiveTab
    );

    async function evaluateGame(analysisGame: AnalysedGame) {
        setAnalysisStatus(AnalysisStatus.EVALUATING);

        if (!analysisGame.source?.chessCom?.isLiveOngoing) {
            setActiveTab(AnalysisTab.REPORT);
        }

        const evaluator = createGameEvaluator(analysisGame, {
            engineVersion: settings.version,
            engineDepth: settings.depth,
            engineTimeLimit: settings.timeLimitEnabled
                ? settings.timeLimit
                : (settings.depth == undefined ? 1 : undefined),
            cloudEngineLines: settings.lines,
            maxEngineCount: 4,
            engineConfig: engine => engine.setLineCount(settings.lines),
            onProgress: progress => {
                setEvaluationProgress(progress);
                dispatchCurrentNodeUpdate();
            }
        });

        evaluator.evaluate()
            .then(() => setAnalysisStatus(
                AnalysisStatus.AWAITING_CAPTCHA
            ))
            .catch(err => {
                if (err == "abort") return;

                console.error(err);
                setAnalysisError(t("analysisError"));
            });

        return evaluator.controller;
    }

    return evaluateGame;
}

export default useEvaluateGame;