import React, { useEffect, useMemo, useRef } from "react";

import {
    getNodeChain,
    getNodeMoveNumber
} from "shared/types/game/position/StateTreeNode";
import { Classification } from "shared/constants/Classification";
import useSettingsStore from "@/stores/SettingsStore";
import {
    classificationColours,
    classificationImages,
    highlightedClassifications,
    shouldShowMoveClassificationIcon
} from "@analysis/constants/classifications";

import * as styles from "./MainlineMoveList.module.css";

interface MainlineMoveListProps {
    className?: string;
    stateTreeRootNode: any;
    selectedNodeId: string;
    onMoveClick: (node: any) => void;
}

interface Row {
    moveNumber: number;
    white?: any;
    black?: any;
}

interface TimestampCellData {
    text: string;
    barWidthPx: number;
    timeValue: number;
}

const pieceClassNameByFigure = {
    K: "king",
    Q: "queen",
    R: "rook",
    B: "bishop",
    N: "knight"
};

function getFigurineColor(
    classification: Classification | undefined,
    isWhiteMove: boolean
) {
    if (
        classification != undefined
        && highlightedClassifications.includes(classification)
    ) {
        return classificationColours[classification as Classification];
    }

    return isWhiteMove ? "#f6f7f8" : "#cbd1d8";
}

function parseSanForFigurine(
    san: string,
    isWhiteMove: boolean
) {
    const pieceMatch = san.match(/^[KQRBN]/);

    if (!pieceMatch) {
        return { piece: undefined, pieceClass: "", text: san };
    }

    const piece = pieceMatch[0] as keyof typeof pieceClassNameByFigure;
    const pieceClass = `${pieceClassNameByFigure[piece]}-${isWhiteMove ? "fill" : "stroke"}`;

    return {
        piece,
        pieceClass,
        text: san.slice(1)
    };
}

function annotationClass(classification?: Classification) {
    if (!classification) return "";

    if (classification == Classification.INACCURACY) return styles.inaccuracy;
    if (classification == Classification.MISTAKE) return styles.mistake;
    if (classification == Classification.BLUNDER) return styles.blunder;

    return "";
}

function formatMoveTime(durationMs?: number) {
    if (durationMs == undefined || Number.isNaN(durationMs)) {
        return undefined;
    }

    return `${(durationMs / 1000).toFixed(1)}s`;
}

function getTimestampCellData(
    durationMs: number | undefined,
    maxDurationMs: number
): TimestampCellData | undefined {
    const text = formatMoveTime(durationMs);

    if (!text || maxDurationMs <= 0 || !durationMs) {
        return;
    }

    const maxBarWidthPx = 30;
    const scaledRatio = Math.sqrt(durationMs / maxDurationMs);
    const barWidthPx = Math.max(
        7,
        scaledRatio * maxBarWidthPx
    );

    return {
        text,
        barWidthPx,
        timeValue: durationMs / 1000
    };
}

function MainlineMoveList({
    className,
    stateTreeRootNode,
    selectedNodeId,
    onMoveClick
}: MainlineMoveListProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const hideClassifications = useSettingsStore(
        state => state.settings.analysis.classifications.hide
    );

    const rows = useMemo<Row[]>(() => {
        const mainline = (getNodeChain as any)(stateTreeRootNode).slice(1) as any[];
        const generatedRows: Row[] = [];

        for (let i = 0; i < mainline.length; i += 2) {
            const white = mainline[i];
            const black = mainline[i + 1];

            if (!white) continue;

            generatedRows.push({
                moveNumber: Math.trunc((getNodeMoveNumber as any)(
                    white,
                    stateTreeRootNode.state.fen
                )),
                white,
                black
            });
        }

        return generatedRows;
    }, [stateTreeRootNode]);

    const maxMoveDurationMs = useMemo(() => {
        const maxDuration = rows.flatMap(row => [
            row.white?.state.move?.clock?.spentMs,
            row.black?.state.move?.clock?.spentMs
        ]).reduce((max, value) => {
            if (value == undefined || Number.isNaN(value)) {
                return max;
            }

            return Math.max(max, value);
        }, 0);

        return maxDuration;
    }, [rows]);

    useEffect(() => {
        if (!selectedNodeId) return;

        const selectedElement = wrapperRef.current
            ?.querySelector(`[data-node="${selectedNodeId}"]`) as HTMLElement | null;

        selectedElement?.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: "smooth"
        });
    }, [selectedNodeId]);

    function renderMoveCell(node: any, isWhiteMove: boolean) {
        const san = node.state.move?.san || "...";
        const parsed = parseSanForFigurine(san, isWhiteMove);
        const classification = node.state.classification as Classification | undefined;
        const figurineColor = getFigurineColor(classification, isWhiteMove);
        const showAnnotationIcon = shouldShowMoveClassificationIcon(
            classification,
            hideClassifications
        );

        return <button
            type="button"
            data-node={node.id}
            className={styles.moveNode + ` ${isWhiteMove ? styles.whiteMove : styles.blackMove} ${annotationClass(classification)}` + (selectedNodeId == node.id ? ` ${styles.selected}` : "")}
            onClick={() => onMoveClick(node)}
        >
            {showAnnotationIcon && classification && <img
                src={classificationImages[classification]}
                width={14}
                height={14}
                className={styles.annotationIcon}
            />}

            <span className={styles.moveContent}>
                <span className={styles.moveText}>
                    {parsed.piece && <span
                        className={`icon-font-chess ${parsed.pieceClass} ${styles.figurine}`}
                        style={{ color: figurineColor }}
                    />}

                    {parsed.text}
                </span>
            </span>
        </button>;
    }

    function renderTimestampCell(
        node: any,
        className: string
    ) {
        const spentMs = node?.state.move?.clock?.spentMs;
        const timestamp = getTimestampCellData(spentMs, maxMoveDurationMs);

        if (!timestamp) {
            return <div className={`${styles.timeCell} ${className} ${styles.timeEmpty}`}></div>;
        }

        return <div
            data-move-list-el="timestamp"
            data-time={timestamp.timeValue}
            className={`${styles.timeCell} ${className}`}
            style={{
                ["--timeValue" as string]: timestamp.timeValue,
                ["--timeBarWidth" as string]: `${timestamp.barWidthPx}px`
            }}
        >
            <span className={styles.timeLabel}>{timestamp.text}</span>
        </div>;
    }

    return <div ref={wrapperRef} className={`${styles.wrapper} ${className || ""}`}>
        {rows.map((row, index) => <div
            key={row.white?.id || `${row.moveNumber}-${index}`}
            className={styles.row + ` ${index % 2 == 0 ? styles.lightRow : styles.darkRow}`}
            data-whole-move-number={row.moveNumber}
        >
            <span className={styles.moveNumber}>{row.moveNumber}.</span>

            {row.white && renderMoveCell(row.white, true)}

            {row.black
                ? renderMoveCell(row.black, false)
                : <div className={styles.blackMovePlaceholder}></div>
            }

            <div className={styles.timeStack}>
                {renderTimestampCell(row.white, styles.timeWhite)}
                {renderTimestampCell(row.black, styles.timeBlack)}
            </div>
        </div>)}
    </div>;
}

export default MainlineMoveList;
