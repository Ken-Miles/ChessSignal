import PlayerProfile from "shared/types/game/PlayerProfile";
import PieceColour from "shared/constants/PieceColour";

interface PlayerProfileProps {
    profile: PlayerProfile;
    profileUrl?: string;
    playerColour?: PieceColour;
    currentFen?: string;
    showClock?: boolean;
    clockTimeMs?: number;
    clockActive?: boolean;
    clockRealtime?: boolean;
}

export default PlayerProfileProps;