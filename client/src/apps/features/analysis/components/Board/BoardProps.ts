import { CSSProperties } from "react";
import { Move } from "chess.js";

import PieceColour from "shared/constants/PieceColour";
import PlayerProfile from "shared/types/game/PlayerProfile";
import Evaluation from "shared/types/game/position/Evaluation";
import { GameOutcomeEffect } from "@analysis/lib/gameOutcome";

export interface BoardArrow {
    from: string;
    to: string;
    color: string;
    isKnight: boolean;
}

type BoardNode = {
    state: {
        fen: string;
        moveColour?: PieceColour;
        clock?: {
            whiteMs?: number;
            blackMs?: number;
        };
    };
};

interface BoardProps {
    className?: string;
    style?: CSSProperties;
    profileClassName?: string;
    profileStyle?: CSSProperties;
    showPlayerClocks?: boolean;
    liveClockRealtime?: boolean;
    whiteProfile?: PlayerProfile;
    blackProfile?: PlayerProfile;
    whiteProfileUrl?: string;
    blackProfileUrl?: string;
    node?: BoardNode;
    flipped?: boolean;
    evaluation?: Evaluation;
    arrows?: BoardArrow[];
    outcomeEffect?: GameOutcomeEffect;
    theme?: {
        lightSquareColour?: string;
        darkSquareColour?: string;
        boardTexture?: string;
        pieceSet?: string;
        preset?: string;
        coordinatesPlacement?: "inside" | "outside" | "off";
    };
    piecesDraggable?: boolean;
    enableClassifications?: boolean;

    onAddMove?: (move: Move) => boolean;
}

export default BoardProps;