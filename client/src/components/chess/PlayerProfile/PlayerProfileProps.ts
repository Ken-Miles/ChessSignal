import PlayerProfile from "shared/types/game/PlayerProfile";
import PieceColour from "shared/constants/PieceColour";

interface PlayerProfileProps {
    profile: PlayerProfile;
    playerColour?: PieceColour;
    currentFen?: string;
    showClock?: boolean;
    clockTimeMs?: number;
    clockActive?: boolean;
}

export default PlayerProfileProps;