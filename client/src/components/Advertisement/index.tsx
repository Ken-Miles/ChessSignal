import React, { useEffect } from "react";

import AdvertisementProps from "./AdvertisementProps";
import * as styles from "./Advertisement.module.css";

function Advertisement({
    className,
    style,
    publisherId,
    adUnitId
}: AdvertisementProps) {
    const pubId = publisherId || process.env.ADS_PUBLISHER_ID;

    useEffect(() => {
        if (!pubId) return;

        const scriptSelector = (
            'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
        );

        if (!document.querySelector(scriptSelector)) {
            const script = document.createElement("script");
            script.async = true;
            script.crossOrigin = "anonymous";
            script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
                + `?client=${pubId}`;

            document.head.appendChild(script);
        }

        try {
            window.adsbygoogle ??= [];
            window.adsbygoogle.push({});
        } catch {
            console.warn("advertisement duplicate load cancelled.");
        }
    }, [pubId]);

    if (!pubId) return null;

    const devClassName = process.env.NODE_ENV == "development"
        ? styles.dev : "";

    return <ins
        className={`adsbygoogle ${className} ${devClassName}`}
        style={{ display: "block", ...style }}
        data-ad-client={pubId}
        data-ad-slot={adUnitId}
    />;
}

export default Advertisement;