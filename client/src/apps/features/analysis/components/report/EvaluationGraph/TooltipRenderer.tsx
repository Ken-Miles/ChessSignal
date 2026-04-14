import React from "react";

import { stringifyEvaluation } from "shared/lib/utils/chess";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useSettingsStore from "@/stores/SettingsStore";
import {
    classificationImages,
    shouldShowMoveClassificationIcon
} from "@analysis/constants/classifications";

import EvaluationGraphPoint from "./Point";
import * as styles from "./EvaluationGraph.module.css";

interface TooltipRendererProps {
    dataPoint: EvaluationGraphPoint;
}

function TooltipRenderer({ dataPoint }: TooltipRendererProps) {
    const boardFlipped = useAnalysisBoardStore(state => state.boardFlipped);
    const hideClassifications = useSettingsStore(
        state => state.settings.analysis.classifications.hide
    );

    const perspectiveEvaluation = {
        ...dataPoint.evaluation,
        value: dataPoint.evaluation.value * (boardFlipped ? -1 : 1)
    };

    return <div className={styles.tooltip}>
        <div className={styles.tooltipEvaluation}>
            {shouldShowMoveClassificationIcon(
                dataPoint.state.classification,
                hideClassifications
            )
                && <img
                    src={classificationImages[dataPoint.state.classification]}
                    height={25}
                />
            }

            <span>
                {stringifyEvaluation(perspectiveEvaluation, true)}
            </span>
        </div>

        {dataPoint.state.move?.san
            && <span className={styles.tooltipMove}>
                {dataPoint.state.move?.san}
            </span>
        }
    </div>;
}

export default TooltipRenderer;