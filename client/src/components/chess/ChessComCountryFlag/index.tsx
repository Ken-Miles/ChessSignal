import React from "react";

import * as styles from "./ChessComCountryFlag.module.css";

type ChessComCountryFlagProps = {
    countryCode?: string;
    countryName?: string;
    className?: string;
};

function ChessComCountryFlag({
    countryCode,
    countryName,
    className
}: ChessComCountryFlagProps) {
    const normalisedCode = (countryCode || "").trim().toLowerCase();

    if (!/^[a-z]{2}$/.test(normalisedCode)) {
        return null;
    }

    return <span
        className={`${styles.flag} country-${normalisedCode} ${className || ""}`.trim()}
        title={countryName || undefined}
        aria-label={countryName
            ? `Country: ${countryName}`
            : `Country code: ${normalisedCode.toUpperCase()}`}
    />;
}

export default ChessComCountryFlag;
