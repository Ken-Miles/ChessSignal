import React, { useMemo, useState } from "react";
import { Chess } from "chess.js";

import PieceColour from "shared/constants/PieceColour";

import PlayerProfileProps from "./PlayerProfileProps";
import * as styles from "./PlayerProfile.module.css";

import iconDefaultProfileImage from "@assets/img/defaultprofileimage.png";

const pieceOrder = [ "q", "r", "b", "n", "p" ] as const;

const initialPieceCount = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1
};

const pieceDisplayLabel = {
    p: "P",
    n: "N",
    b: "B",
    r: "R",
    q: "Q"
};

const pieceValue = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9
};

function getCapturedPieceSpriteClass(
    pieceType: keyof typeof initialPieceCount,
    count: number,
    opponentColour: "w" | "b"
) {
    if (pieceType == "p") {
        const boundedCount = Math.max(1, Math.min(8, count));
        return `captured-pieces-${opponentColour}-${boundedCount == 1 ? "pawn" : `${boundedCount}-pawns`}`;
    }

    if (pieceType == "b") {
        return `captured-pieces-${opponentColour}-${count > 1 ? "2-bishops" : "bishop"}`;
    }

    if (pieceType == "n") {
        return `captured-pieces-${opponentColour}-${count > 1 ? "2-knights" : "knight"}`;
    }

    if (pieceType == "r") {
        return `captured-pieces-${opponentColour}-${count > 1 ? "2-rooks" : "rook"}`;
    }

    return `captured-pieces-${opponentColour}-queen`;
}

function PlayerProfile({
    profile,
    playerColour,
    currentFen
}: PlayerProfileProps) {
    const [ defaultImage, setDefaultImage ] = useState(false);

    const capturedState = useMemo(() => {
        if (!playerColour || !currentFen) {
            return {
                captures: [] as Array<{ type: keyof typeof initialPieceCount; count: number }>,
                score: 0,
                opponentColour: "b" as "w" | "b"
            };
        }

        const board = new Chess(currentFen).board();
        const opponentColour: "w" | "b" = playerColour == PieceColour.WHITE ? "b" : "w";

        const remaining = {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0
        };

        for (const row of board) {
            for (const square of row) {
                if (!square) continue;
                if (square.color != opponentColour) continue;
                if (!(square.type in remaining)) continue;

                remaining[square.type as keyof typeof remaining] += 1;
            }
        }

        const capturedParts = pieceOrder
            .map(type => {
                const missing = initialPieceCount[type] - remaining[type];
                return missing > 0
                    ? { type, count: missing }
                    : undefined;
            })
            .filter(Boolean);

        const score = capturedParts
            .reduce((total, item) => {
                const typed = item as { type: keyof typeof pieceValue; count: number };
                return total + (pieceValue[typed.type] * typed.count);
            }, 0);

        return {
            captures: capturedParts as Array<{ type: keyof typeof initialPieceCount; count: number }>,
            score,
            opponentColour
        };
    }, [currentFen, playerColour]);

    return <div className={styles.wrapper}>
        <div className={styles.playerInfo}>
            {profile.image && <img
                className={styles.profileImage}
                src={defaultImage
                    ? iconDefaultProfileImage
                    : profile.image
                }
                onError={() => setDefaultImage(true)}
            />}

            <div className={styles.content}>
                <div className={`${styles.identityRow} cc-user-block-component cc-user-block-white cc-user-block-small`}>
                    {profile.title && <span className={styles.title}>
                        {profile.title}
                    </span>}

                    <span className={`${styles.username} cc-text-medium-bold cc-user-username-component cc-user-username-white cc-user-block-username`}>
                        {profile.username || "?"}
                    </span>

                    {profile.rating != undefined
                        && <span className={`${styles.rating} cc-text-medium cc-user-rating-white`}>
                            ({profile.rating})
                        </span>
                    }
                </div>

                <div className={styles.capturesRow}>
                    {capturedState.captures.map(entry => <span
                        key={entry.type}
                        className={`${styles.capturePiece} captured-pieces-cpiece ${getCapturedPieceSpriteClass(entry.type, entry.count, capturedState.opponentColour)}`}
                        title={`${pieceDisplayLabel[entry.type]} x${entry.count}`}
                    />)}

                    <span className={`${styles.captureScore} captured-pieces-score`}>
                        {capturedState.score > 0 ? `+${capturedState.score}` : ""}
                    </span>
                </div>
            </div>
        </div>

        <div className={styles.clock}>
            <span className={styles.clockTime}>--:--</span>
        </div>
    </div>;
}

export default PlayerProfile;