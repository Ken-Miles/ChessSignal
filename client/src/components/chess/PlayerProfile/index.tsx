import React, { useEffect, useMemo, useRef, useState } from "react";
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

function formatClockTime(clockTimeMs?: number, showTenths = false) {
    if (clockTimeMs == undefined || Number.isNaN(clockTimeMs)) {
        return "--:--";
    }

    if (showTenths) {
        const totalTenths = Math.max(0, Math.floor(clockTimeMs / 100));
        const minutes = Math.trunc(totalTenths / 600);
        const seconds = Math.trunc((totalTenths % 600) / 10);
        const tenths = totalTenths % 10;

        return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
    }

    const totalSeconds = Math.max(0, Math.round(clockTimeMs / 1000));
    const hours = Math.trunc(totalSeconds / 3600);
    const minutes = Math.trunc((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function PlayerProfile({
    profile,
    profileUrl,
    playerColour,
    currentFen,
    showClock = true,
    clockTimeMs,
    clockActive = false,
    clockRealtime = false
}: PlayerProfileProps) {
    const [ defaultImage, setDefaultImage ] = useState(false);
    const [ liveClockDisplayMs, setLiveClockDisplayMs ] = useState<number | undefined>(clockTimeMs);
    const initialClockTimeMsRef = useRef<number>();
    const displayedClockMs = liveClockDisplayMs;
    const isLowTimeValue = displayedClockMs != undefined
        && !Number.isNaN(displayedClockMs)
        && displayedClockMs < 20000;
    const isLowTime = clockActive
        && displayedClockMs != undefined
        && !Number.isNaN(displayedClockMs)
        && displayedClockMs < 20000;

    useEffect(() => {
        setLiveClockDisplayMs(clockTimeMs);
    }, [clockTimeMs]);

    useEffect(() => {
        if (!clockRealtime || !clockActive) {
            return;
        }

        if (clockTimeMs == undefined || Number.isNaN(clockTimeMs)) {
            return;
        }

        const startedAt = Date.now();
        const baselineMs = clockTimeMs;

        const intervalId = window.setInterval(() => {
            const elapsedMs = Date.now() - startedAt;
            const remainingMs = Math.max(0, baselineMs - elapsedMs);

            setLiveClockDisplayMs(remainingMs);
        }, 100);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [clockRealtime, clockActive, clockTimeMs]);

    useEffect(() => {
        if (displayedClockMs == undefined || Number.isNaN(displayedClockMs)) {
            return;
        }

        if (initialClockTimeMsRef.current == undefined || displayedClockMs > initialClockTimeMsRef.current) {
            initialClockTimeMsRef.current = displayedClockMs;
        }
    }, [displayedClockMs]);

    const clockRotationDeg = useMemo(() => {
        if (displayedClockMs == undefined || Number.isNaN(displayedClockMs) || initialClockTimeMsRef.current == undefined) {
            return 0;
        }

        const elapsedMs = Math.max(0, initialClockTimeMsRef.current - displayedClockMs);

        const MILLISECONDS_PER_TICK = 1000;
        const steps = Math.floor(elapsedMs / MILLISECONDS_PER_TICK);
        return steps * 90;
    }, [displayedClockMs]);

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

                    {profileUrl
                        ? <a
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.username} ${styles.usernameLink} cc-text-medium-bold cc-user-username-component cc-user-username-white cc-user-block-username`}
                        >
                            {profile.username || "?"}
                        </a>
                        : <span className={`${styles.username} cc-text-medium-bold cc-user-username-component cc-user-username-white cc-user-block-username`}>
                            {profile.username || "?"}
                        </span>
                    }

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

        {showClock && <div
            className={`${styles.clock} ${clockActive ? styles.clockActive : styles.clockInactive} ${playerColour == PieceColour.WHITE ? styles.clockWhite : styles.clockBlack} ${clockActive && playerColour == PieceColour.BLACK ? styles.clockBlackActive : ""} ${isLowTime ? styles.clockLowTime : ""}`}
        >
            <span className={styles.clockIcon}>
                <svg
                    viewBox="0 0 20 20"
                    width="20"
                    height="20"
                    aria-hidden="true"
                    style={{ transform: `rotate(${clockRotationDeg}deg)` }}
                >
                    <path d="M5.48,9a.93.93,0,0,0-.3.71v.58a.94.94,0,0,0,.3.71,1,1,0,0,0,.71.3h4.58a1,1,0,0,0,.71-.3.94.94,0,0,0,.29-.71V9.7A.92.92,0,0,0,11.48,9a1,1,0,0,0-.71-.27H6.19A1,1,0,0,0,5.48,9Z"></path>
                    <path d="M19.22,6.1a9.9,9.9,0,0,0-2.14-3.18A10.23,10.23,0,0,0,13.9.78,9.76,9.76,0,0,0,10,0,9.86,9.86,0,0,0,6.1.78,10,10,0,0,0,.78,6.1,9.81,9.81,0,0,0,0,10a9.81,9.81,0,0,0,.78,3.9A10,10,0,0,0,6.1,19.22,9.86,9.86,0,0,0,10,20a9.76,9.76,0,0,0,3.89-.78,10.23,10.23,0,0,0,3.18-2.14,9.9,9.9,0,0,0,2.14-3.18A9.81,9.81,0,0,0,20,10,9.81,9.81,0,0,0,19.22,6.1ZM17.07,13a7.65,7.65,0,0,1-1.65,2.42A7.81,7.81,0,0,1,13,17.06a7.46,7.46,0,0,1-3,.6,7.51,7.51,0,0,1-3-.6,7.74,7.74,0,0,1-2.43-1.65A8,8,0,0,1,2.94,13a7.46,7.46,0,0,1-.6-3,7.46,7.46,0,0,1,.6-3A8,8,0,0,1,4.58,4.59,7.74,7.74,0,0,1,7,2.94a7.51,7.51,0,0,1,3-.6,7.45,7.45,0,0,1,3,.6,7.74,7.74,0,0,1,2.43,1.65A7.65,7.65,0,0,1,17.07,7a7.46,7.46,0,0,1,.6,3A7.46,7.46,0,0,1,17.07,13Z"></path>
                </svg>
            </span>

            <span className={styles.clockTime}>{formatClockTime(displayedClockMs, isLowTimeValue)}</span>
        </div>}
    </div>;
}

export default PlayerProfile;