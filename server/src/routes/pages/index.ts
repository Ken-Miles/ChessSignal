import { Router } from "express";

import appRouter from "@/lib/appRouter";
import featuresRouter from "./features";
import accountRouter from "./account";
import footerRouter from "./footer";

const router = Router();

router.use("/",
    accountRouter,
    featuresRouter,
    footerRouter
);

router.get("/settings*", appRouter({
    bundleName: "settings",
    meta: {
        title: "Settings",
        description: "Manage your ChessSignal settings.",
        ogTitle: "♟️ ChessSignal - Settings",
        ogDescription: "Manage your ChessSignal settings."
    }
}));

router.get("/", async (req, res) => {
    res.redirect("/analysis");
});

router.get("/*", appRouter({
    bundleName: "unfound",
    meta: {
        title: "Page Not Found",
        description: "The page you requested could not be found.",
        ogTitle: "♟️ ChessSignal - Page Not Found",
        ogDescription: "The page you requested could not be found.",
        robots: "noindex, nofollow"
    }
}));

export default router;