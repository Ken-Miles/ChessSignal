import React, { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import {
    getNodeMoveNumber
} from "shared/types/game/position/StateTreeNode";
import { Classification } from "shared/constants/Classification";
import PieceColour from "shared/constants/PieceColour";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
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
    whiteVariations?: any[];
    blackVariations?: any[];
}

interface TimestampCellData {
    text: string;
    barWidthPx: number;
    timeValue: number;
}

function getVisibleChildren(node: any) {
    return node.children.filter((child: any) => {
        if (child.source == "engine") return false;
        if (child.source == "user") return true;

        if (child.parent?.id && typeof child.id == "string") {
            return !child.id.startsWith(`${child.parent.id}-`);
        }

        return true;
    });
}

function getVisibleChain(rootNode: any) {
    const chain: any[] = [rootNode];
    let current = rootNode;

    while (current) {
        const visibleChildren = getVisibleChildren(current);
        const nextNode = visibleChildren.find((child: any) => child.mainline)
            || visibleChildren[0];

        if (!nextNode) break;

        chain.push(nextNode);
        current = nextNode;
    }

    return chain;
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

    const {
        currentStateTreeNodeUpdate
    } = useAnalysisBoardStore(useShallow(state => ({
        currentStateTreeNodeUpdate: state.currentStateTreeNodeUpdate
    })));

    const rows = useMemo<Row[]>(() => {
        const mainline = getVisibleChain(stateTreeRootNode).slice(1) as any[];
        const generatedRows: Row[] = [];

        for (let i = 0; i < mainline.length; i += 2) {
            const white = mainline[i];
            const black = mainline[i + 1];

            if (!white) continue;

            const whiteVariations = getVisibleChildren(white).filter((child: any) => !child.mainline);
            const blackVariations = black
                ? getVisibleChildren(black).filter((child: any) => !child.mainline)
                : [];

            generatedRows.push({
                moveNumber: Math.trunc((getNodeMoveNumber as any)(
                    white,
                    stateTreeRootNode.state.fen
                )),
                white,
                black,
                whiteVariations: whiteVariations.length > 0 ? whiteVariations : undefined,
                blackVariations: blackVariations.length > 0 ? blackVariations : undefined
            });
        }

        return generatedRows;
    }, [stateTreeRootNode, currentStateTreeNodeUpdate]);

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

    function getVariationRows(startNode: any) {
        const variationRows: Row[] = [];
        let currentRow: Row | undefined;
        let current = startNode;

        while (current) {
            const node = current;
            const moveNumber = Math.trunc((getNodeMoveNumber as any)(
                node,
                stateTreeRootNode.state.fen
            ));

            if (node.state.moveColour == PieceColour.WHITE) {
                if (currentRow) {
                    variationRows.push(currentRow);
                }

                currentRow = {
                    moveNumber,
                    white: node
                };

                current = getVisibleChildren(node)[0];
                continue;
            }

            if (!currentRow) {
                currentRow = {
                    moveNumber,
                    black: node
                };

                current = getVisibleChildren(node)[0];
                continue;
            }

            currentRow.black = node;

            current = getVisibleChildren(node)[0];
        }

        if (currentRow) {
            variationRows.push(currentRow);
        }

        return variationRows;
    }

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

    function renderVariationRows(
        startNode: any,
        keyPrefix: string,
        rowClassName: string
    ) {
        return getVariationRows(startNode).map((row, index) => (
            <div
                key={`${keyPrefix}-${row.white?.id || row.black?.id || index}`}
                className={`${styles.variationRow} ${rowClassName}`}
                data-whole-move-number={row.moveNumber}
            >
                <span className={`${styles.moveNumber} ${styles.variationMoveNumber}`}>
                    {row.moveNumber}.
                </span>

                {row.white
                    ? renderMoveCell(row.white, true)
                    : <div className={styles.whiteMovePlaceholder}></div>
                }

                {row.black
                    ? renderMoveCell(row.black, false)
                    : <div className={styles.blackMovePlaceholder}></div>
                }

                <div className={styles.timeStack}>
                    {renderTimestampCell(row.white, styles.timeWhite)}
                    {renderTimestampCell(row.black, styles.timeBlack)}
                </div>
            </div>
        ));
    }

    function shouldDeferBlackVariationsToNextRow(
        row: Row,
        nextRow: Row | undefined
    ) {
        if (!row.blackVariations?.length) return false;
        if (!row.black || !nextRow?.white) return false;

        return nextRow.white.parent == row.black;
    }

    return <div ref={wrapperRef} className={`${styles.wrapper} ${className || ""}`}>
        {rows.map((row, index) => <React.Fragment
            key={row.white?.id || `${row.moveNumber}-${index}`}
        >
            <div
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
            </div>

            {index > 0
                && shouldDeferBlackVariationsToNextRow(rows[index - 1], row)
                && rows[index - 1].blackVariations?.map((varNode, variationIndex) => renderVariationRows(
                    varNode,
                    `${rows[index - 1].black?.id || rows[index - 1].moveNumber}-b${variationIndex}-deferred`,
                    (index - 1) % 2 == 0 ? styles.lightRow : styles.darkRow
                ))
            }

            {row.whiteVariations?.map((varNode, variationIndex) => renderVariationRows(
                varNode,
                `${row.white?.id || row.moveNumber}-w${variationIndex}`,
                index % 2 == 0 ? styles.lightRow : styles.darkRow
            ))}

            {!shouldDeferBlackVariationsToNextRow(row, rows[index + 1])
                && row.blackVariations?.map((varNode, variationIndex) => renderVariationRows(
                    varNode,
                    `${row.black?.id || row.moveNumber}-b${variationIndex}`,
                    index % 2 == 0 ? styles.lightRow : styles.darkRow
                ))
            }
        </React.Fragment>)}
    </div>;
}

export default MainlineMoveList;
