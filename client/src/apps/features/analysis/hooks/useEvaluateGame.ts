import { useTranslation } from "react-i18next";

import AnalysedGame from "shared/types/game/AnalysedGame";
import EngineVersion from "shared/constants/EngineVersion";
import AnalysisStatus from "@analysis/constants/AnalysisStatus";
import AnalysisTab from "@analysis/constants/AnalysisTab";
import { findFirstCompatibleEngineVersion } from "@analysis/lib/engineVersionAvailability";
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
        setEvaluationController,
        setAnalysisStatus,
        setEvaluationProgress,
        setAnalysisError
    } = useAnalysisProgressStore();

    const setActiveTab = useAnalysisTabStore(
        state => state.setActiveTab
    );

    async function evaluateGame(analysisGame: AnalysedGame) {
        const selectedEngineVersion = await findFirstCompatibleEngineVersion([
            settings.version
        ]) || await findFirstCompatibleEngineVersion([
            EngineVersion.STOCKFISH_18_LITE,
            EngineVersion.STOCKFISH_18_LITE_SINGLE,
            EngineVersion.STOCKFISH_18_SINGLE,
            EngineVersion.STOCKFISH_18_ASM,
            EngineVersion.STOCKFISH_17_LITE,
            EngineVersion.STOCKFISH_17,
            EngineVersion.STOCKFISH_17_ASM
        ]);

        if (!selectedEngineVersion) {
            setAnalysisStatus(AnalysisStatus.AWAITING_CAPTCHA);
            setAnalysisError(t("analysisError"));

            const noopController = new AbortController();
            return noopController;
        }

        setAnalysisStatus(AnalysisStatus.EVALUATING);

        if (!analysisGame.source?.chessCom?.isLiveOngoing) {
            setActiveTab(AnalysisTab.REPORT);
        }

        const evaluator = createGameEvaluator(analysisGame, {
            engineVersion: selectedEngineVersion,
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
            .then(() => {
                setEvaluationProgress(1);
                setEvaluationController();
                setAnalysisStatus(AnalysisStatus.AWAITING_CAPTCHA);
            })
            .catch(err => {
                if (err == "abort") return;

                console.error(err);
                setEvaluationController();
                setAnalysisError(t("analysisError"));
            });

        return evaluator.controller;
    }

    return evaluateGame;
}

export default useEvaluateGame;