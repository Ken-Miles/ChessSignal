import { Router } from "express";

import appRouter from "@/lib/appRouter";
import { accountAuthenticator } from "@/lib/security/account";

const router = Router();

router.get("/analysis", appRouter({
    bundleName: "analysis",
    meta: {
        title: "Game Analysis",
        description: "Analyse your Chess games, free of charge.",
        ogTitle: "♟️ ChessTracker - Analysis",
        ogDescription: "Analyse Chess games for free."
    }
}));

router.get("/archive",
    accountAuthenticator(true),
    appRouter({
        bundleName: "archive",
        meta: {
            title: "Game Archive",
            ogTitle: "♟️ ChessTracker - Archive",
            ogDescription: "Your saved or analysed games on ChessTracker are kept in your Game Archive.",
            ogUrl: "https://chesstracker.aidenpearce.space/archive"
        }
    })
);

router.get("/news*", appRouter({
    bundleName: "news",
    meta: {
        title: "ChessTracker News",
        description: "The latest news on the ChessTracker platform.",
        ogTitle: "♟️ ChessTracker - News",
        ogDescription: "Read the latest news on the ChessTracker platform.",
        ogUrl: "https://chesstracker.aidenpearce.space/news"
    }
}));

export default router;