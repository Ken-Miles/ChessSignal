import { Router } from "express";

import appRouter from "@/lib/appRouter";
import { accountAuthenticator } from "@/lib/security/account";

const router = Router();

router.get("/analysis", appRouter({
    bundleName: "analysis",
    meta: {
        title: "Game Analysis",
        description: "Analyse your Chess games, free of charge.",
        ogTitle: "♟️ ChessSignal - Analysis",
        ogDescription: "Analyse Chess games for free."
    }
}));

router.get("/archive",
    accountAuthenticator(true),
    appRouter({
        bundleName: "archive",
        meta: {
            title: "Game Archive",
            ogTitle: "♟️ ChessSignal - Archive",
            ogDescription: "Your saved or analysed games on ChessSignal are kept in your Game Archive.",
            ogUrl: "https://chesssignal.aidenpearce.space/archive"
        }
    })
);

router.get("/news*", appRouter({
    bundleName: "news",
    meta: {
        title: "ChessSignal News",
        description: "The latest news on ChessSignal.",
        ogTitle: "♟️ ChessSignal - News",
        ogDescription: "Read the latest news on ChessSignal.",
        ogUrl: "https://chesssignal.aidenpearce.space/news"
    }
}));

export default router;