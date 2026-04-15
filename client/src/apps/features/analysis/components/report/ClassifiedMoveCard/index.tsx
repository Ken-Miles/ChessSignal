import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Chess } from "chess.js";

import {
    StateTreeNode,
    addChildMove,
    findNodeRecursively
} from "shared/types/game/position/StateTreeNode";
import { Classification } from "shared/constants/Classification";
import { getSimpleNotation } from "shared/lib/utils/chess";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import {
    classificationColours,
    classificationImages,
    loadingClassificationIcon,
    errorClassificationIcon,
    inalterableClassifications
} from "@analysis/constants/classifications";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisProgressStore from "@analysis/stores/AnalysisProgressStore";
import LogMessage from "@/components/common/LogMessage";
import playBoardSound from "@/lib/boardSounds";

import * as styles from "./ClassifiedMoveCard.module.css";

function getPlayedMove(currentNode: StateTreeNode) {
    if (!currentNode.parent) return;
    if (!currentNode.state.move) return;

    const previousBoard = new Chess(currentNode.parent.state.fen);

    return previousBoard.move(currentNode.state.move.san);
}

function getTopAlternativeMove(currentNode: StateTreeNode) {
    if (!currentNode.parent) return;

    const bestAlternativeUci = getTopEngineLine(
        currentNode.parent.state.engineLines
    )?.moves.at(0)?.uci;

    if (!bestAlternativeUci) return;

    const previousBoard = new Chess(currentNode.parent.state.fen);

    try {
        return previousBoard.move(bestAlternativeUci);
    } catch {
        return;
    }
}

function getClassificationIconSrc(
    classification: Classification | undefined,
    realtimeClassifyError: string | undefined
) {
    if (classification) {
        return classificationImages[classification] || loadingClassificationIcon;
    }

    return realtimeClassifyError
        ? errorClassificationIcon
        : loadingClassificationIcon;
}

function ClassifiedMoveCard() {
    const { t } = useTranslation(["common", "analysis"]);

    const { settings } = useSettingsStore();

    const {
        currentStateTreeNode: node,
        setCurrentStateTreeNode,
        dispatchCurrentNodeUpdate
    } = useAnalysisBoardStore();

    const {
        realtimeClassifyError,
        realtimeClassifyErrorNodeId,
        setRealtimeClassifyError
    } = useAnalysisProgressStore(
        useShallow(state => ({
            realtimeClassifyError: state.realtimeClassifyError,
            realtimeClassifyErrorNodeId: state.realtimeClassifyErrorNodeId,
            setRealtimeClassifyError: state.setRealtimeClassifyError
        }))
    );

    useEffect(() => setRealtimeClassifyError(), [node]);

    const showRealtimeClassifyError = realtimeClassifyError
        && realtimeClassifyErrorNodeId == node.id;

    const nearestOpeningName = findNodeRecursively(
        node,
        searchNode => !!searchNode.state.opening,
        true
    )?.state.opening;
    const nodeClassification = node.state.classification as Classification | undefined;

    const nodeEvaluation = getTopEngineLine(node.state.engineLines)?.evaluation;

    const advantageGoesToWhite = nodeEvaluation
        ? nodeEvaluation.value >= 0
        : undefined;

    const advantageText = nodeEvaluation
        ? (nodeEvaluation.type == "mate"
            ? `${nodeEvaluation.value > 0 ? "+" : "-"}M${Math.abs(nodeEvaluation.value)}`
            : `${nodeEvaluation.value > 0 ? "+" : ""}${(nodeEvaluation.value / 100).toFixed(2)}`
        )
        : undefined;

    const playedMove = getPlayedMove(node);
    const playedMoveText = settings.analysis.simpleNotation && playedMove
        ? getSimpleNotation(playedMove)
        : node.state.move?.san;
    const classificationText = t(
        "classifiedMoveCard.classifications."
        + node.state.classification,
        {
            ns: "analysis",
            defaultValue: node.state.classification == Classification.MISS
                ? "is a miss"
                : undefined
        }
    );
    const playedMoveMessage = [playedMoveText, classificationText]
        .filter(Boolean)
        .join(" ");

    const topAlternativeMove = getTopAlternativeMove(node);

    function playTopAlternative() {
        if (!node.parent) return;
        if (!topAlternativeMove) return;

        const createdNode = addChildMove(node.parent, topAlternativeMove.san);

        setCurrentStateTreeNode(createdNode);
        dispatchCurrentNodeUpdate();
        playBoardSound(createdNode);
    }

    return <div className={styles.wrapper}>
        <div
            className={styles.classificationSection}
            style={nearestOpeningName
                ? { borderRadius: "10px 10px 0 0" }
                : undefined
            }
        >
            <div className={styles.classification}>
                <img src={getClassificationIconSrc(nodeClassification, showRealtimeClassifyError ? realtimeClassifyError : undefined)}/>

                <span
                    className={styles.classificationName}
                    style={{
                        color: nodeClassification
                            ? classificationColours[nodeClassification]
                            : (showRealtimeClassifyError
                                ? classificationColours[Classification.BLUNDER]
                                : "white"
                            )
                    }}
                >
                    {nodeClassification
                        ? playedMoveMessage
                        : (showRealtimeClassifyError
                            ? t("error") : t("loading")
                        )
                    }
                </span>

                {advantageGoesToWhite != undefined && advantageText && <span
                    className={styles.classificationAdvantage}
                    style={advantageGoesToWhite
                        ? {
                            backgroundColor: "#f1f4f8",
                            color: "#1a1d22"
                        }
                        : {
                            backgroundColor: "#1b1e24",
                            color: "#f0f3f8"
                        }
                    }
                >
                    {advantageText}
                </span>}
            </div>

            {showRealtimeClassifyError
                && <LogMessage style={{ marginTop: "5px" }}>
                    {t(realtimeClassifyError, { ns: "analysis" })}
                </LogMessage>
            }

            {topAlternativeMove
                && nodeClassification
                && topAlternativeMove.san != node.state.move?.san
                && !inalterableClassifications.includes(nodeClassification)
                && <span className={styles.bestAlternativeComment}>
                    <span>
                        {t("classifiedMoveCard.alternative", { ns: "analysis" })}
                    </span>

                    <span
                        className={styles.bestAlternativeMove}
                        onClick={playTopAlternative}
                    >
                        {settings.analysis.simpleNotation
                            ? getSimpleNotation(topAlternativeMove)
                            : topAlternativeMove.san
                        }
                    </span>
                </span>
            }
        </div>

        {nearestOpeningName
            && <div className={styles.opening}>
                {nearestOpeningName}
            </div>
        }
    </div>;
}

export default ClassifiedMoveCard;