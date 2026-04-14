import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Chess } from "chess.js";
import { range } from "lodash-es";

import { EngineLine } from "shared/types/game/position/EngineLine";
import EngineVersion from "shared/constants/EngineVersion";
import LogMessage from "@/components/common/LogMessage";
import Engine from "@analysis/lib/engine";
import { findFirstCompatibleEngineVersion } from "@analysis/lib/engineVersionAvailability";
import { evaluateMovesParallel, type MoveEvaluation } from "@analysis/lib/evaluateMovesParallel";

import EngineLineInfo from "./EngineLine";
import SkeletonLine from "./SkeletonLine";
import RealtimeEngineProps from "./RealtimeEngineProps";
import * as styles from "./RealtimeEngine.module.css";

type Timeout = ReturnType<typeof setTimeout>;

function RealtimeEngine({
    className,
    style,
    initialPosition,
    playedUciMoves,
    config,
    onEngineLines,
    onMoveEvaluations,
    onEvaluationStart,
    onEvaluationComplete
}: RealtimeEngineProps) {
    const hydratedConfig = { ...config, lines: config.lines || 1 };

    const { t } = useTranslation("analysis");

    const [ engine, setEngine ] = useState<Engine>();
    const [ resolvedEngineVersion, setResolvedEngineVersion ] = useState<EngineVersion>();

    const [
        realtimeEngineLines,
        setRealtimeEngineLines
    ] = useState<EngineLine[]>([]);

    const [ moveEvaluations, setMoveEvaluations ] = useState<MoveEvaluation[]>([]);

    const [ evaluationError, setEvaluationError ] = useState<string>();

    const evaluationDelayRef = useRef<Timeout>();
    const moveEvaluationAbortControllerRef = useRef<AbortController>();

    const position = useMemo(() => {
        const board = new Chess(initialPosition);
        if (!playedUciMoves) return initialPosition;

        for (const uciMove of playedUciMoves) {
            try {
                board.move(uciMove);
            } catch {
                return initialPosition;
            }
        }

        return board.fen();
    }, [initialPosition, playedUciMoves]);

    // Instantiate new engine when version changes
    useEffect(() => {
        engine?.terminate();
        setEngine(undefined);
        setResolvedEngineVersion(undefined);

        let disposed = false;

        async function initializeEngine() {
            let version = await findFirstCompatibleEngineVersion([
                hydratedConfig.version
            ]);

            if (!version) {
                version = await findFirstCompatibleEngineVersion([
                    EngineVersion.STOCKFISH_18_LITE,
                    EngineVersion.STOCKFISH_18_LITE_SINGLE,
                    EngineVersion.STOCKFISH_18_SINGLE,
                    EngineVersion.STOCKFISH_18_ASM,
                    EngineVersion.STOCKFISH_17_LITE,
                    EngineVersion.STOCKFISH_17,
                    EngineVersion.STOCKFISH_17_ASM
                ]);
            }

            if (disposed) return;

            if (!version) {
                setEvaluationError(t("realtimeEngine.error"));
                return;
            }

            try {
                setEvaluationError(undefined);
                setEngine(new Engine(version));
                setResolvedEngineVersion(version);
            } catch {
                setEvaluationError(t("realtimeEngine.error"));
            }
        }

        void initializeEngine();

        return () => {
            disposed = true;
        };
    }, [hydratedConfig.version]);

    // Get number of lines expected to appear
    const expectedLineCount = useMemo(() => Math.min(
        new Chess(position).moves().length,
        hydratedConfig.lines
    ), [position, hydratedConfig.lines]);

    const lineSourceVersion = resolvedEngineVersion || hydratedConfig.version;

    // Compute displayed lines directly from live engine output.
    const displayedLines = useMemo(() => {
        const sourceMatched = realtimeEngineLines.filter(
            line => line.source == lineSourceVersion
        );

        const candidateLines = sourceMatched.length > 0
            ? sourceMatched
            : realtimeEngineLines;

        const topDepth = candidateLines.reduce(
            (maxDepth, line) => Math.max(maxDepth, line.depth || 0),
            0
        );

        const depthFiltered = topDepth > 0
            ? candidateLines.filter(line => (line.depth || 0) == topDepth)
            : candidateLines;

        const latestByIndex = new Map<number, EngineLine>();
        for (const line of depthFiltered) {
            if (line.index <= 0) continue;
            latestByIndex.set(line.index, line);
        }

        return Array.from(latestByIndex.values())
            .sort((a, b) => a.index - b.index)
            .slice(0, hydratedConfig.lines);
    }, [realtimeEngineLines, hydratedConfig.lines, lineSourceVersion]);

    useEffect(() => (
        onEngineLines?.(displayedLines)
    ), [displayedLines]);

    useEffect(() => (
        onMoveEvaluations?.(moveEvaluations)
    ), [moveEvaluations]);

    async function evaluatePosition() {
        if (!engine) return;

        engine.setPosition(initialPosition, playedUciMoves);
        engine.setLineCount(hydratedConfig.lines);

        try {
            setEvaluationError(undefined);
            onEvaluationStart?.();

            // Cancel any previous move evaluations
            moveEvaluationAbortControllerRef.current?.abort();
            moveEvaluationAbortControllerRef.current = new AbortController();

            // Start main evaluation
            const mainEvaluationPromise = engine.evaluate({
                depth: hydratedConfig.depth,
                timeLimit: (
                    hydratedConfig.timeLimit
                    && (hydratedConfig.timeLimit * 1000)
                ),
                onEngineLine: line => {
                    setRealtimeEngineLines(prev => [ ...prev, line ]);
                }
            });

            // Start move evaluations in parallel
            const moveEvaluationPromise = evaluateMovesParallel({
                initialPosition,
                playedUciMoves,
                engineVersion: resolvedEngineVersion || hydratedConfig.version,
                depth: hydratedConfig.depth,
                timeLimit: hydratedConfig.timeLimit,
                lines: hydratedConfig.lines,
                onMoveEvaluation: (moveEval) => {
                    setMoveEvaluations(prev => {
                        // Avoid duplicates
                        if (prev.some(m => m.uciMove === moveEval.uciMove)) {
                            return prev;
                        }
                        return [ ...prev, moveEval ];
                    });
                },
                signal: moveEvaluationAbortControllerRef.current.signal
            }).catch(error => {
                // Handle abort gracefully
                if (error.message !== "Evaluation aborted") {
                    console.error("Move evaluation error:", error);
                }
                return [];
            });

            // Wait for both evaluations to complete
            const [ lines ] = await Promise.all([
                mainEvaluationPromise,
                moveEvaluationPromise
            ]);

            onEvaluationComplete?.(lines);
        } catch {
            setEvaluationError(
                t("realtimeEngine.error")
            );
        }
    }

    // Evaluate position when settings or position change
    useEffect(() => {
        if (!engine) return;

        async function queueEvaluation() {
            await engine?.stopEvaluation();

            // Cancel move evaluations
            moveEvaluationAbortControllerRef.current?.abort();

            if (evaluationDelayRef.current) {
                clearTimeout(evaluationDelayRef.current);
            }

            setRealtimeEngineLines([]);
            setMoveEvaluations([]);

            evaluationDelayRef.current = setTimeout(evaluatePosition, 400);
        }

        queueEvaluation();
    }, [
        position,
        engine,
        hydratedConfig.depth,
        hydratedConfig.lines,
        hydratedConfig.timeLimit
    ]);

    return <div
        className={`${styles.wrapper} ${className}`}
        style={style}
    >
        <span className={styles.depth}>
            <span>
                {t("realtimeEngine.depth")}
            </span>

            <span>
                {displayedLines.at(0)?.depth || 0}
            </span>
        </span>

        {displayedLines.map((line, index) => <React.Fragment
            key={line.index ?? `${line.moves.at(0)?.uci || "line"}-${index}`}
        >
            <EngineLineInfo line={line} key={line.index} />

            {index != (displayedLines.length - 1)
                && <hr className={styles.engineLineSeparator} />
            }
        </React.Fragment>)}

        {(!!engine && !evaluationError)
            && range(
                Math.max(0, expectedLineCount - displayedLines.length)
            ).map((_, index) => <React.Fragment
                key={`skeleton-${index}`}
            >
                <hr className={styles.engineLineSeparator} />
                <SkeletonLine/>
            </React.Fragment>)
        }

        {evaluationError && <LogMessage>
            {evaluationError}
        </LogMessage>}
    </div>;
}

export default RealtimeEngine;