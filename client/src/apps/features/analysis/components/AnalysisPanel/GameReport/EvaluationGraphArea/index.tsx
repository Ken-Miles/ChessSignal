import React, { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { findIndex } from "lodash-es";

import EngineVersion from "shared/constants/EngineVersion";
import { getNodeChain } from "shared/types/game/position/StateTreeNode";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import EvaluationGraph from "@analysis/components/report/EvaluationGraph";
import useSettingsStore from "@/stores/SettingsStore";
import playBoardSound from "@/lib/boardSounds";
import SettingsDialog from "../../../SettingsDialog";
import * as styles from "../GameReport.module.css";

import iconSettings from "@assets/img/interface/settings.svg";

const engineVersionLabels: Record<EngineVersion, string> = {
    [EngineVersion.LICHESS_CLOUD]: "Lichess Cloud",
    [EngineVersion.STOCKFISH_17_ASM]: "Stockfish 17 (Compatibility)",
    [EngineVersion.STOCKFISH_17_LITE]: "Stockfish 17 Lite",
    [EngineVersion.STOCKFISH_17]: "Stockfish 17",
    [EngineVersion.STOCKFISH_18_ASM]: "Stockfish 18 (Compatibility)",
    [EngineVersion.STOCKFISH_18_LITE]: "Stockfish 18 Lite",
    [EngineVersion.STOCKFISH_18_LITE_SINGLE]: "Stockfish 18 Lite Single",
    [EngineVersion.STOCKFISH_18]: "Stockfish 18",
    [EngineVersion.STOCKFISH_18_SINGLE]: "Stockfish 18 Single"
};

function EvaluationGraphArea() {
    const analysisGame = useAnalysisGameStore(state => state.analysisGame);
    const [ settingsOpen, setSettingsOpen ] = useState(false);

    const engineSettings = useSettingsStore(state => state.settings.analysis.engine);

    const {
        currentStateTreeNode,
        setCurrentStateTreeNode
    } = useAnalysisBoardStore(
        useShallow(state => ({
            currentStateTreeNode: state.currentStateTreeNode,
            setCurrentStateTreeNode: state.setCurrentStateTreeNode
        }))
    );

    const mainlineChain = getNodeChain(analysisGame.stateTree);

    const activeEngineLabel = engineVersionLabels[engineSettings.version]
        || "Stockfish";

    const effectiveDepth = engineSettings.depth
        ?? getTopEngineLine(currentStateTreeNode.state.engineLines)?.depth;

    const engineStatusLabel = effectiveDepth != undefined
        ? `Depth ${effectiveDepth}`
        : (
            engineSettings.timeLimitEnabled
                ? `Max ${engineSettings.timeLimit}s`
                : "Max 1s"
        );

    return <div className={styles.graphSection}>
        <div className={styles.engineHeader}>
            <span className={`${styles.engineHeaderText} ${styles.engineHeaderDepth}`}>
                {engineStatusLabel}
            </span>

            <div className={styles.engineHeaderRight}>
                <span className={`${styles.engineHeaderText} ${styles.engineHeaderEngine}`}>
                    {engineSettings.enabled
                        ? activeEngineLabel
                        : "Engine Off"
                    }
                </span>

                <button
                    type="button"
                    className={styles.engineHeaderButton}
                    aria-label="Engine settings"
                    onClick={() => setSettingsOpen(true)}
                >
                    <img src={iconSettings} width={14} height={14} />
                </button>
            </div>
        </div>

        <EvaluationGraph
            nodes={mainlineChain}
            selectedIndex={findIndex(
                mainlineChain,
                node => node.id == currentStateTreeNode.id
            )}
            onPointClick={point => {
                const clickedNode = mainlineChain.find(
                    node => node.id == point.nodeId
                );
                if (!clickedNode) return;

                setCurrentStateTreeNode(clickedNode);
                playBoardSound(clickedNode);
            }}
        />

        {settingsOpen && <SettingsDialog
            onClose={() => setSettingsOpen(false)}
        />}
    </div>;
}

export default EvaluationGraphArea;