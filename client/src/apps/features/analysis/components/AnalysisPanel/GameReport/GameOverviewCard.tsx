import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { sumBy } from "lodash-es";

import AnalysedGame from "shared/types/game/AnalysedGame";
import PieceColour from "shared/constants/PieceColour";
import { Classification } from "shared/constants/Classification";
import {
    getNodeChain
} from "shared/types/game/position/StateTreeNode";
import {
    classificationImages,
    classificationColours
} from "@analysis/constants/classifications";

import * as styles from "./GameOverviewCard.module.css";

import iconDefaultProfileImage from "@assets/img/defaultprofileimage.png";

interface GameOverviewCardProps {
    analysisGame: AnalysedGame;
    accuracies: {
        white: number;
        black: number;
    };
}

type OverviewRow = {
    label: string;
    icon: string;
    color: string;
    whiteCount: number;
    blackCount: number;
};

function getClassificationCount(
    chain: any[],
    colour: PieceColour,
    classification: Classification
) {
    return sumBy(
        chain,
        node => Number(
            node.state.moveColour == colour
            && node.state.classification == classification
        )
    );
}

function GameOverviewCard({ analysisGame, accuracies }: GameOverviewCardProps) {
    const { t } = useTranslation("analysis");

    const nodeChain = useMemo(
        () => (getNodeChain as any)(analysisGame.stateTree) as any[],
        [analysisGame.stateTree]
    );

    const rows = useMemo<OverviewRow[]>(() => {
        const make = (
            label: string,
            classification: Classification
        ): OverviewRow => ({
            label,
            icon: classificationImages[classification],
            color: classificationColours[classification],
            whiteCount: getClassificationCount(nodeChain, PieceColour.WHITE, classification),
            blackCount: getClassificationCount(nodeChain, PieceColour.BLACK, classification)
        });

        return [
            make("Brilliant", Classification.BRILLIANT),
            make("Great", Classification.CRITICAL),
            make("Book", Classification.THEORY),
            make("Best", Classification.BEST),
            make("Excellent", Classification.EXCELLENT),
            make("Good", Classification.OKAY),
            make("Inaccuracy", Classification.INACCURACY),
            make("Mistake", Classification.MISTAKE),
            make("Miss", Classification.MISS),
            make("Blunder", Classification.BLUNDER)
        ];
    }, [nodeChain]);

    const whitePlayer = analysisGame.players.white;
    const blackPlayer = analysisGame.players.black;

    return <section className={styles.wrapper}>
        <div className={styles.headerRow}>
            <span className={styles.headerSpacer}/>
            <span className={`${styles.cell} ${styles.playerName}`}>
                {whitePlayer.username || "White"}
            </span>
            <span className={`${styles.cell} ${styles.playerName}`}>
                {blackPlayer.username || "Black"}
            </span>
        </div>

        <div className={styles.infoRow}>
            <span className={styles.rowTitle}>
                {t("accuraciesCard.players", { defaultValue: "Players" })}
            </span>
            <span className={styles.cell}>
                <img
                    className={styles.avatar}
                    src={whitePlayer.image || iconDefaultProfileImage}
                />
            </span>
            <span className={styles.cell}>
                <img
                    className={styles.avatar}
                    src={blackPlayer.image || iconDefaultProfileImage}
                />
            </span>
        </div>

        <div className={styles.infoRow}>
            <span className={styles.rowTitle}>Accuracy</span>
            <span className={styles.cell}>
                <span className={`${styles.ratingPill} ${styles.whitePill}`}>
                    {Number.isFinite(accuracies.white) ? accuracies.white.toFixed(1) : "N/A"}
                </span>
            </span>
            <span className={styles.cell}>
                <span className={`${styles.ratingPill} ${styles.blackPill}`}>
                    {Number.isFinite(accuracies.black) ? accuracies.black.toFixed(1) : "N/A"}
                </span>
            </span>
        </div>

        <hr className={styles.separator}/>

        <div className={styles.tallies}>
            {rows.map(row => <div key={row.label} className={styles.talliesRow}>
                <span className={styles.rowTitle}>{row.label}</span>

                <span className={`${styles.tallyValue} ${styles.tallyWhite}`} style={{ color: row.color }}>
                    {row.whiteCount}
                </span>

                <span className={styles.tallyGlyph}>
                    <img src={row.icon} width={22} height={22} />
                </span>

                <span className={`${styles.tallyValue} ${styles.tallyBlack}`} style={{ color: row.color }}>
                    {row.blackCount}
                </span>
            </div>)}
        </div>

        <hr className={styles.separator}/>

        <div className={styles.infoRow}>
            <span className={styles.rowTitle}>Game Rating</span>
            <span className={styles.cell}>
                <span className={`${styles.ratingPill} ${styles.whitePill}`}>
                    {whitePlayer.rating != undefined ? whitePlayer.rating : "N/A"}
                </span>
            </span>
            <span className={styles.cell}>
                <span className={`${styles.ratingPill} ${styles.blackPill}`}>
                    {blackPlayer.rating != undefined ? blackPlayer.rating : "N/A"}
                </span>
            </span>
        </div>
    </section>;
}

export default GameOverviewCard;
