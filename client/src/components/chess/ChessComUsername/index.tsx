import React from "react";

import * as styles from "./ChessComUsername.module.css";

type ChessComUsernameProps = {
    username?: string;
    fallback?: string;
    status?: string;
    profileUrl?: string;
    className?: string;
    usernameClassName?: string;
    hideBadge?: boolean;
};

function BadgeIcon({ status }: { status: string }) {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus == "premium") {
        return <a
            className={`${styles.badge} ${styles.premiumBadge}`}
            data-cy="cc-user-badge-diamond"
            href="https://www.chess.com/membership?b=badge-diamond&c=web_game_live"
            target="_blank"
            rel="noopener noreferrer"
            title="Chess.com Premium Member"
            aria-label="Chess.com Premium Member"
        >
            <span className={styles.iconGlyph}>
                <svg aria-hidden="true" data-glyph="membership-tier-diamond" viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path xmlns="http://www.w3.org/2000/svg" d="M22.5699 8.87L12.8699 21.54C12.2399 22.34 11.7699 22.34 11.1399 21.54L1.43993 8.87C0.80993 8.07 0.83993 7.44 1.56993 6.7L4.99993 3.03C5.72993 2.3 6.39993 2 7.42993 2H16.5599C17.5899 2 18.2599 2.3 18.9899 3.03L22.4199 6.7C23.1499 7.43 23.1899 8.07 22.5499 8.87H22.5699Z"></path>
                </svg>
            </span>
        </a>;
    }

    if (normalizedStatus == "staff") {
        return <span
            className={`${styles.badge} ${styles.staffBadge}`}
            title="Chess.com Staff Member"
            aria-label="Chess.com Staff Member"
        >
            <span className={styles.iconGlyph}>
                <svg aria-hidden="true" data-glyph="piece-pawn-brand-3" viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path xmlns="http://www.w3.org/2000/svg" d="M12.0001 22.3299C5.37007 22.2999 5.07007 21.1299 5.07007 20.9999C5.07007 19.2699 5.64007 17.5999 7.04007 16.5699C9.67007 14.5699 10.0401 12.7399 10.1401 11.5699V10.6699H8.01007C7.78007 10.1999 7.64007 9.79992 7.64007 9.26992L10.0401 7.69992C9.21007 7.09992 8.67007 6.12992 8.67007 4.99992C8.67007 3.16992 10.1401 1.66992 12.0001 1.66992C13.8701 1.66992 15.3301 3.16992 15.3301 4.99992C15.3301 6.12992 14.8001 7.09992 13.9601 7.69992L16.3601 9.26992C16.3601 9.79992 16.2301 10.1999 15.9901 10.6699H13.8601V11.5699C13.9601 12.7399 14.3301 14.5699 16.9601 16.5699C18.3601 17.5999 18.9301 19.2699 18.9301 20.9999C18.9301 21.1299 18.6301 22.2999 12.0001 22.3299Z"></path>
                </svg>
            </span>
        </span>;
    }

    if (normalizedStatus == "mod" || normalizedStatus == "moderator") {
        return <a
            className={`${styles.badge} ${styles.moderatorBadge}`}
            data-cy="cc-user-badge-moderator"
            //href="https://www.chess.com/about"
            href="https://www.chess.com/blog/Richard/the-chess-community-needs-you-moderator-application"
            target="_blank"
            rel="noopener noreferrer"
            title="Chess.com Moderator"
            aria-label="Chess.com Moderator"
        >
            <span className={styles.iconGlyph}>
                <svg aria-hidden="true" data-glyph="utility-shield-blank" viewBox="0 0 24 24" height="12" width="12" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path xmlns="http://www.w3.org/2000/svg" d="M13.3 23.6302C12.37 24.0602 11.63 24.0602 10.7 23.6302C5 20.7602 2 17.2002 2 12.0002V5.4302C2 4.4002 2.4 4.0002 3.43 3.9602C6.8 3.7602 8.33 2.8602 10.86 0.890195C11.69 0.220195 12.29 0.220195 13.13 0.890195C15.66 2.8602 17.2 3.7602 20.56 3.9602C21.59 3.9902 21.99 4.3902 21.99 5.4302V12.0002C21.99 17.2002 18.99 20.7702 13.29 23.6302H13.3Z"></path>
                </svg>
            </span>
        </a>;
    }

    return null;
}

function ChessComUsername({
    username,
    fallback = "?",
    status,
    profileUrl,
    className,
    usernameClassName,
    hideBadge = false
}: ChessComUsernameProps) {
    const displayName = username || fallback;
    const identityClassName = [ styles.identity, className ].filter(Boolean).join(" ");
    const usernameClass = [ styles.username, usernameClassName ].filter(Boolean).join(" ");

    return <span className={identityClassName}>
        {status && !hideBadge && <BadgeIcon status={status} />}

        {profileUrl
            ? <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={usernameClass}
            >
                {displayName}
            </a>
            : <span className={usernameClass}>
                {displayName}
            </span>
        }
    </span>;
}

export default ChessComUsername;
