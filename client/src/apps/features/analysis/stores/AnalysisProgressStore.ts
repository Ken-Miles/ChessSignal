import { create } from "zustand";

import AnalysisStatus from "@analysis/constants/AnalysisStatus";

// Analysis = evaluating & classifying entire game
// Classify = classification for single, manual move
interface AnalysisProgressStore {
    evaluationController?: AbortController;
    evaluationProgress: number;
    analysisStatus: AnalysisStatus;
    analysisError?: string;
    realtimeClassifyError?: string;
    realtimeClassifyErrorNodeId?: string;

    setEvaluationController: (controller?: AbortController) => void;
    setEvaluationProgress: (progress: number) => void;
    setAnalysisStatus: (status: AnalysisStatus) => void;
    setAnalysisError: (error?: string) => void;
    setRealtimeClassifyError: (error?: string, nodeId?: string) => void;
}

const useAnalysisProgressStore = create<AnalysisProgressStore>(set => ({
    evaluationProgress: 0,
    analysisStatus: AnalysisStatus.INACTIVE,

    setEvaluationController(controller) {
        set({ evaluationController: controller });
    },

    setEvaluationProgress(progress) {
        set({ evaluationProgress: progress });
    },

    setAnalysisStatus(status) {
        set({ analysisStatus: status });
    },

    setAnalysisError(error) {
        set({ analysisError: error });
    },

    setRealtimeClassifyError(error, nodeId) {
        set({
            realtimeClassifyError: error,
            realtimeClassifyErrorNodeId: nodeId
        });
    }
}));

export default useAnalysisProgressStore;