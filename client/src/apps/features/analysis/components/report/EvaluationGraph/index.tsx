import React from "react";
import {
    ResponsiveContainer,
    XAxis,
    YAxis,
    AreaChart,
    Area,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ReferenceDot
} from "recharts";

import Evaluation from "shared/types/game/position/Evaluation";
import { defaultEvaluation } from "shared/constants/utils";
import { Classification } from "shared/constants/Classification";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import { classificationColours, highlightedClassifications } from "@analysis/constants/classifications";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";

import EvaluationGraphPoint from "./Point";
import TooltipRenderer from "./TooltipRenderer";
import EvaluationGraphProps from "./EvaluationGraphProps";
import * as styles from "./EvaluationGraph.module.css";



const CHESSCOM_GRAPH_ABS_CP = 1000;
const CHESSCOM_GRAPH_MATE_CP = 1100;

function getGraphY(
    evaluation: Evaluation,
    perspectiveMultiplier: number
) {
    let graphValue = 0;

    if (evaluation.type == "mate") {
        graphValue = evaluation.value == 0
            ? 0
            : evaluation.value > 0
                ? CHESSCOM_GRAPH_MATE_CP
                : -CHESSCOM_GRAPH_MATE_CP;
    } else {
        graphValue = Math.max(
            -CHESSCOM_GRAPH_MATE_CP,
            Math.min(CHESSCOM_GRAPH_MATE_CP, evaluation.value)
        );
    }

    return graphValue * perspectiveMultiplier;
}

function EvaluationGraph({
    className,
    style,
    nodes,
    selectedIndex,
    onPointClick
}: EvaluationGraphProps) {
    const boardFlipped = useAnalysisBoardStore(state => state.boardFlipped);
    const perspectiveMultiplier = boardFlipped ? -1 : 1;

    const dataPoints = nodes.map((node, index) => {
        const evaluation = getTopEngineLine(node.state.engineLines)?.evaluation
            || defaultEvaluation;

        return {
            nodeId: node.id,
            state: node.state,
            evaluation: evaluation,
            x: index,
            y: getGraphY(evaluation, perspectiveMultiplier)
        } as EvaluationGraphPoint;
    });
    const yAxisMin = -CHESSCOM_GRAPH_ABS_CP;
    const yAxisMax = CHESSCOM_GRAPH_ABS_CP;

    const highlightedPoints = dataPoints.filter(point => {
        const classification = point.state.classification as Classification | undefined;

        return classification != undefined
            && highlightedClassifications.includes(classification);
    });

    const selectedPoint = dataPoints[selectedIndex];

    const selectedPointColour = selectedPoint?.state.classification
        ? classificationColours[selectedPoint.state.classification]
        : "gray";

    return <div className={styles.wrapper}>
        <ResponsiveContainer
            width={style?.width || "100%"}
            height={style?.height || 100}
        >
            <AreaChart
                className={`${styles.chart} ${className}`}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                data={dataPoints}
                onClick={event => {
                    const payload = event.activePayload?.at(0)?.payload;
                    if (!payload) return;

                    onPointClick?.(payload as EvaluationGraphPoint);
                }}
            >
                <XAxis hide dataKey="x"/>
                <YAxis hide domain={[yAxisMin, yAxisMax]} tickCount={5}/>

                <CartesianGrid
                    vertical={false}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth={1}
                />

                <Area
                    dataKey="y"
                    type="monotone"
                    baseValue={yAxisMin}
                    fill="#7cb5ec"
                    fillOpacity={0.28}
                    stroke="#7cb5ec"
                    strokeWidth={2}
                    isAnimationActive={false}
                />

                <ReferenceLine
                    y={0}
                    stroke="gray"
                    strokeOpacity={0.5}
                    strokeWidth={2}
                />

                {selectedPoint && <>
                    <ReferenceLine
                        x={selectedPoint.x}
                        stroke={selectedPointColour}
                        strokeWidth={2}
                    />

                    <ReferenceDot
                        x={selectedPoint.x}
                        y={selectedPoint.y}
                        r={4}
                        fill={selectedPointColour}
                        strokeWidth={0}
                    />
                </>}

                {highlightedPoints.map(point => <ReferenceDot
                    key={point.nodeId}
                    x={point.x}
                    y={point.y}
                    r={3}
                    fill={classificationColours[point.state.classification!]}
                    strokeWidth={0}
                />)}

                <Tooltip content={({ label }) => {
                    const point = typeof label == "number"
                        && dataPoints[label];

                    return point
                        ? <TooltipRenderer dataPoint={point} />
                        : null;
                }}/>
            </AreaChart>
        </ResponsiveContainer>
    </div>;
}

export default EvaluationGraph;