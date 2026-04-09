import { Router } from "express";

import appRouter from "@/lib/appRouter";
import createApiDocsRouter from "@/lib/api/docsRouter";
import internalAuthenticator from "@/lib/security/internal";

import loginRouter from "../../../internal/login";
import publishAnnouncementRouter from "../../../internal/publishAnnouncement";
import deleteArticleRouter from "../../../internal/news/deleteArticle";
import publishArticleRouter from "../../../internal/news/publishArticle";

const router = Router();

router.use("/internal",
    loginRouter,
    publishAnnouncementRouter,
    publishArticleRouter,
    deleteArticleRouter
);

router.use("/internal",
    internalAuthenticator(true),
    createApiDocsRouter({
        apiBasePath: "/api/v1",
        includeInternal: true,
        title: "ChessTracker Internal API",
        description: "Internal API documentation for maintainers."
    }),
    appRouter({
        bundleName: "internal",
        meta: {
            title: "Internal",
            description: "ChessTracker internal tools.",
            ogTitle: "♟️ ChessTracker - Internal",
            ogDescription: "ChessTracker internal tools.",
            robots: "noindex, nofollow"
        }
    })
);

export default router;
