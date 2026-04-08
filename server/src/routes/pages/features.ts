import { Router } from "express";

import appRouter from "@/lib/appRouter";
import { accountAuthenticator } from "@/lib/security/account";

const router = Router();

router.get("/analysis", appRouter({
    bundleName: "analysis",
    meta: {
        title: "Game Analysis",
        description: "Analyse your Chess games, free of charge.",
        ogTitle: "♟️ WintrChess - Analysis",
        ogDescription: "Analyse Chess games for free."
    }
}));

router.get("/archive",
    accountAuthenticator(true),
    appRouter({
        bundleName: "archive",
        meta: {
            title: "Game Archive",
            ogTitle: "♟️ WintrChess - Archive",
            ogDescription: "Your saved or analysed games on WintrChess are kept in your Game Archive.",
            ogUrl: "https://wintrchess.com/archive"
        }
    })
);

router.get("/news*", appRouter({
    bundleName: "news",
    meta: {
        title: "WintrChess News",
        description: "The latest news on the WintrChess platform.",
        ogTitle: "♟️ WintrChess - News",
        ogDescription: "Read the latest news on the WintrChess platform.",
        ogUrl: "https://wintrchess.com/news"
    }
}));

export default router;