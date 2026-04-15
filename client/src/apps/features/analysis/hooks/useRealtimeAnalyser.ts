import { useEffect, useRef, useState } from "react";
import { StatusCodes } from "http-status-codes";

import { useAltcha } from "@/apps/features/analysis/hooks/useAltcha";
import AnalysisStatus from "@analysis/constants/AnalysisStatus";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisProgressStore from "@analysis/stores/AnalysisProgressStore";
import useAnalysisSessionStore from "@analysis/stores/AnalysisSessionStore";
import { analyseNode } from "@analysis/lib/reporter";

function useRealtimeAnalyser() {
    const executeCaptcha = useAltcha();

    const settings = useSettingsStore(state => state.settings.analysis);

    const {
        analysisSessionToken,
        analysisCaptchaError
    } = useAnalysisSessionStore();

    const {
        currentStateTreeNode,
        dispatchCurrentNodeUpdate
    } = useAnalysisBoardStore();

    const setRealtimeClassifyError = useAnalysisProgressStore(
        state => state.setRealtimeClassifyError
    );

    const [
        classifyStatus,
        setClassifyStatus
    ] = useState(AnalysisStatus.INACTIVE);
    const realtimeAnalyseInFlightRef = useRef(false);

    function cancelAnalyse(errorString?: string) {
        setClassifyStatus(AnalysisStatus.INACTIVE);
        realtimeAnalyseInFlightRef.current = false;
        setRealtimeClassifyError(errorString, currentStateTreeNode.id);
    }

    // Reattempt classification when CAPTCHA token updates
    useEffect(() => {
        if (classifyStatus != AnalysisStatus.AWAITING_CAPTCHA) return;

        if (analysisCaptchaError) {
            return cancelAnalyse(analysisCaptchaError);
        }

        considerRealtimeAnalyse();
    }, [
        classifyStatus,
        analysisSessionToken,
        analysisCaptchaError
    ]);

    useEffect(() => {
        if (classifyStatus != AnalysisStatus.INACTIVE) return;
        if (!currentStateTreeNode.parent) return;
        if (currentStateTreeNode.state.classification) return;
        if (currentStateTreeNode.parent.state.engineLines.length == 0) return;
        if (realtimeAnalyseInFlightRef.current) return;

        void considerRealtimeAnalyse();
    }, [
        classifyStatus,
        currentStateTreeNode,
        currentStateTreeNode.parent?.state.engineLines.length
    ]);

    async function considerRealtimeAnalyse() {
        if (realtimeAnalyseInFlightRef.current) return;

        realtimeAnalyseInFlightRef.current = true;

        if (!currentStateTreeNode.parent) {
            realtimeAnalyseInFlightRef.current = false;
            return;
        }

        // If there is not enough data for a centipawn comparison
        const parentState = currentStateTreeNode.parent.state;

        if (parentState.engineLines.length == 0) {
            realtimeAnalyseInFlightRef.current = false;
            if (!currentStateTreeNode.state.classification) return;

            return cancelAnalyse("classifiedMoveCard.insufficientLines");
        }

        const analyseNodeResult = await analyseNode(currentStateTreeNode, {
            includeBrilliant: settings.classifications.included.brilliant,
            includeTheory: settings.classifications.included.theory
        });

        // If session is invalid, await a new CAPTCHA solve
        if (analyseNodeResult.status == StatusCodes.UNAUTHORIZED) {
            realtimeAnalyseInFlightRef.current = false;
            executeCaptcha();
            setClassifyStatus(AnalysisStatus.AWAITING_CAPTCHA);

            return;
        }

        if (!analyseNodeResult.node) {
            realtimeAnalyseInFlightRef.current = false;
            setClassifyStatus(AnalysisStatus.INACTIVE);
            return;
        }

        // Apply classification and deactivate classifier
        const currentState = currentStateTreeNode.state;
        const analysedState = analyseNodeResult.node.state;

        currentState.classification = analysedState.classification;
        currentState.accuracy = analysedState.accuracy;
        currentState.opening = analysedState.opening;

        if (!analysedState.classification) {
            realtimeAnalyseInFlightRef.current = false;
            setClassifyStatus(AnalysisStatus.INACTIVE);
            return;
        }

        realtimeAnalyseInFlightRef.current = false;
        cancelAnalyse();
        dispatchCurrentNodeUpdate();
    }

    return considerRealtimeAnalyse;
}

export default useRealtimeAnalyser;