import { CSSProperties } from "react";

import { EngineLine } from "shared/types/game/position/EngineLine";
import EngineVersion from "shared/constants/EngineVersion";
import { MoveEvaluation } from "@analysis/lib/evaluateMovesParallel";

interface RealtimeEngineProps {
    className?: string;
    style?: CSSProperties;
    initialPosition: string;
    playedUciMoves?: string[];
    cachedEngineLines?: EngineLine[];
    shouldEvaluate?: boolean;
    config: {
        version: EngineVersion;
        depth?: number;
        lines?: number;
        threads?: number;
        timeLimit?: number;
    };
    onEngineLines?: (lines: EngineLine[]) => void;
    onMoveEvaluations?: (moveEvals: MoveEvaluation[]) => void;
    onEvaluationStart?: () => void;
    onEvaluationComplete?: (lines: EngineLine[]) => void;
}

export default RealtimeEngineProps;