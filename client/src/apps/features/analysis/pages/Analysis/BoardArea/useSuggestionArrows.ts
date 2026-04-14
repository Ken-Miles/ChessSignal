import { useMemo } from "react";
import { Chess } from "chess.js";

import { Classification } from "shared/constants/Classification";
import { parseUciMove } from "shared/lib/utils/chess";
import { getTopEngineLine } from "shared/types/game/position/EngineLine";
import { classificationColours } from "@analysis/constants/classifications";
import EngineArrowType from "@analysis/constants/EngineArrowType";
import useSettingsStore from "@/stores/SettingsStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useRealtimeEngineStore from "@analysis/stores/RealtimeEngineStore";

const arrowColour = classificationColours[Classification.BEST];
const liveResponseArrowColour = "hsla(70, 65%, 55%, 0.95)";

export interface SuggestionArrow {
    from: string;
    to: string;
    color: string;
    isKnight: boolean;
}

function buildSuggestionArrow(fen: string, uciMove: string | undefined, color: string): SuggestionArrow | undefined {
    if (!uciMove) return undefined;

    const move = parseUciMove(uciMove);
    const piece = new Chess(fen).get(move.from);

    return {
        from: move.from,
        to: move.to,
        color,
        isKnight: piece?.type == "n"
    };
}

function useSuggestionArrows(): SuggestionArrow[] {
    const settings = useSettingsStore(state => state.settings.analysis);

    const node = useAnalysisBoardStore(state => state.currentStateTreeNode);
    const isLiveOngoing = useAnalysisGameStore(
        state => state.analysisGame.source?.chessCom?.isLiveOngoing == true
    );

    const { displayedEngineLines } = useRealtimeEngineStore();

    return useMemo(() => {
        const arrowsType = settings.engine.suggestionArrows;

        if (arrowsType == EngineArrowType.TOP_CONTINUATION) {
            const topLineMoves = displayedEngineLines.at(0)?.moves;
            const uciMove = topLineMoves?.at(0)?.uci;
            const arrows: SuggestionArrow[] = [];

            const topArrow = buildSuggestionArrow(node.state.fen, uciMove, arrowColour);
            if (!topArrow) return arrows;

            arrows.push(topArrow);

            if (isLiveOngoing) {
                const responseUci = topLineMoves?.at(1)?.uci;

                if (!uciMove || !responseUci) {
                    return arrows;
                }

                const responseBoard = new Chess(node.state.fen);
                const appliedMove = parseUciMove(uciMove);
                responseBoard.move(appliedMove);
                const responseArrow = buildSuggestionArrow(
                    responseBoard.fen(),
                    responseUci,
                    liveResponseArrowColour
                );

                if (responseArrow) {
                    arrows.push(responseArrow);
                }
            }

            return arrows;
        }

        if (arrowsType == EngineArrowType.TOP_ALTERNATIVE) {
            if (!node.parent) return [];

            const previousTopUci = getTopEngineLine(
                node.parent.state.engineLines
            )?.moves.at(0)?.uci;

            const previousArrow = buildSuggestionArrow(
                node.parent.state.fen,
                previousTopUci,
                arrowColour
            );

            return previousArrow ? [previousArrow] : [];
        }

        return [];
    }, [
        node.state.fen,
        isLiveOngoing,
        displayedEngineLines,
        settings.engine.suggestionArrows
    ]);
}

export default useSuggestionArrows;