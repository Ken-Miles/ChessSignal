import { useMemo } from "react";
import { Arrow } from "react-chessboard/dist/chessboard/types";

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

function useSuggestionArrows(): Arrow[] {
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
            if (!uciMove) return [];

            const topMove = parseUciMove(uciMove);
            const arrows: Arrow[] = [[topMove.from, topMove.to, arrowColour]];

            if (isLiveOngoing) {
                const responseUci = topLineMoves?.at(1)?.uci;

                if (responseUci) {
                    const responseMove = parseUciMove(responseUci);

                    arrows.push([
                        responseMove.from,
                        responseMove.to,
                        liveResponseArrowColour
                    ]);
                }
            }

            return arrows;
        }

        if (arrowsType == EngineArrowType.TOP_ALTERNATIVE) {
            if (!node.parent) return [];

            const previousTopUci = getTopEngineLine(
                node.parent.state.engineLines
            )?.moves.at(0)?.uci;
            if (!previousTopUci) return [];

            const previousTopMove = parseUciMove(previousTopUci);

            return [[previousTopMove.from, previousTopMove.to, arrowColour]];
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