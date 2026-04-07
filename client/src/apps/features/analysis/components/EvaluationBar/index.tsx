import React, { useMemo } from "react";
import { clamp } from "lodash-es";

import PieceColour from "shared/constants/PieceColour";
import { stringifyEvaluation } from "shared/lib/utils/chess";

import EvaluationBarProps from "./EvaluationBarProps";
import * as styles from "./EvaluationBar.module.css";

function EvaluationBar({
    className,
    style,
    evaluation,
    moveColour,
    flipped = false
}: EvaluationBarProps) {
    const exactEvaluationText = useMemo(() => {
        if (evaluation.type == "mate") {
            return `${evaluation.value > 0 ? "+" : "-"}M${Math.abs(evaluation.value)}`;
        }

        return `${evaluation.value > 0 ? "+" : ""}${(evaluation.value / 100).toFixed(2)}`;
    }, [evaluation]);

    const oppositeExactEvaluationText = useMemo(() => {
        if (evaluation.type == "mate") {
            return `${evaluation.value > 0 ? "-" : "+"}M${Math.abs(evaluation.value)}`;
        }

        const oppositeValue = (evaluation.value * -1) / 100;
        return `${oppositeValue > 0 ? "+" : ""}${oppositeValue.toFixed(2)}`;
    }, [evaluation]);

    const evaluationText = useMemo(() => (
        stringifyEvaluation({
            ...evaluation,
            value: Math.abs(evaluation.value)
        }, false, 2)
    ), [evaluation]);

    const abbreviatedEvaluationText = useMemo(() => {
        if (evaluation.type == "mate") {
            return `M${Math.abs(evaluation.value)}`;
        }

        return (Math.abs(evaluation.value) / 100).toFixed(1);
    }, [evaluation]);

    const overBarHeight = useMemo(() => {
        if (evaluation.type == "centipawn") {
            return clamp(
                50 - (evaluation.value / 20),
                5, 95
            );
        } else {
            return evaluation.value == 0
                ? (moveColour == PieceColour.WHITE ? 0 : 100)
                : (evaluation.value > 0 ? 0 : 100);
        }
    }, [evaluation]);

    const textBottom = overBarHeight > 50 == flipped;

    return <div
        className={`${styles.evaluationBar} ${className}`}
        title={exactEvaluationText}
        style={{
            backgroundColor: flipped ? "#0f1012" : "#f4f4f4",
            ...style
        }}
    >
        <div
            className={styles.overBar}
            style={{
                backgroundColor: flipped ? "#f4f4f4" : "#0f1012",
                height: flipped
                    ? `calc(100% - ${overBarHeight}%)`
                    : `${overBarHeight}%`
            }}
        />

        <span
            className={`${styles.evaluationText} ${styles.evaluationTextShort}`}
            style={{
                [textBottom ? "bottom" : "top"]: "6px",
                color: overBarHeight > 50 ? "#f3f3f3" : "#0f1012",
                backgroundColor: overBarHeight > 50
                    ? "rgba(15, 16, 18, 0.85)"
                    : "rgba(255, 255, 255, 0.88)"
            }}
        >
            {abbreviatedEvaluationText}
        </span>

        <span
            className={`${styles.evaluationText} ${styles.evaluationTextFull}`}
            style={{
                [textBottom ? "bottom" : "top"]: "6px",
                color: overBarHeight > 50 ? "#f3f3f3" : "#0f1012",
                backgroundColor: overBarHeight > 50
                    ? "rgba(15, 16, 18, 0.85)"
                    : "rgba(255, 255, 255, 0.88)"
            }}
        >
            {evaluationText}
        </span>

        <span className={styles.exactEvaluationTooltip}>
            <span className={styles.tooltipRow}>White {exactEvaluationText}</span>
            <span className={styles.tooltipRow}>Black {oppositeExactEvaluationText}</span>
        </span>
    </div>;
}

export default EvaluationBar;