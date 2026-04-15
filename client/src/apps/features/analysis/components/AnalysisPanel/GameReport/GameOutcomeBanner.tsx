import React, { useEffect, useMemo, useState } from "react";

import PieceColour from "shared/constants/PieceColour";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import { getGameOutcomeSummary } from "@analysis/lib/gameOutcome";
import * as styles from "./GameReport.module.css";

import iconDefaultProfileImage from "@assets/img/defaultprofileimage.png";

function formatOutcomeReason(reason?: string) {
    if (!reason) return undefined;

    if (!reason[0]) return reason;

    return reason[0].toUpperCase() + reason.slice(1);
}

function GameOutcomeBanner() {
    const analysisGame = useAnalysisGameStore(state => state.analysisGame);
    const [ winnerImageLoadFailed, setWinnerImageLoadFailed ] = useState(false);

    const summary = useMemo(() => getGameOutcomeSummary(analysisGame), [analysisGame]);

    const winnerProfile = useMemo(() => {
        if (!summary?.winnerColour) {
            return undefined;
        }

        return summary.winnerColour == PieceColour.WHITE
            ? analysisGame.players.white
            : analysisGame.players.black;
    }, [analysisGame.players.black, analysisGame.players.white, summary?.winnerColour]);

    const winnerImage = winnerImageLoadFailed
        ? iconDefaultProfileImage
        : (winnerProfile?.image || iconDefaultProfileImage);
    const outcomeReason = formatOutcomeReason(summary?.reason);

    useEffect(() => {
        setWinnerImageLoadFailed(false);
    }, [summary?.winnerColour, winnerProfile?.image]);

    if (!summary) {
        return null;
    }

    return <div className={`${styles.outcomeBanner} ${styles[`outcome${summary.tone[0].toUpperCase()}${summary.tone.slice(1)}`]}`}>
        {(summary.tone == "win" || summary.tone == "lose")
            ? <img
                className={styles.outcomeWinnerAvatar}
                src={winnerImage}
                alt={winnerProfile?.username
                    ? `${winnerProfile.username} profile picture`
                    : "Winner profile picture"
                }
                onError={() => setWinnerImageLoadFailed(true)}
            />
            : <span className={styles.outcomeBadge}>
                {summary.tone == "draw" ? "=" : "i"}
            </span>
        }

        <div className={styles.outcomeText}>
            <span className={styles.outcomeTitle}>
                {summary.title}
            </span>

            {outcomeReason && <span className={styles.outcomeExactResult}>
                by {outcomeReason}
            </span>}
        </div>
    </div>;
}

export default GameOutcomeBanner;
