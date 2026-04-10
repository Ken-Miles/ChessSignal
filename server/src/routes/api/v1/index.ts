import { Router } from "express";

import createApiDocsRouter from "@/lib/api/docsRouter";

import publicRouter from "./public";
import internalRouter from "./internal";

const router = Router();

router.use("/",
    createApiDocsRouter({
        apiBasePath: "/api/v1",
        includeInternal: false,
        title: "ChessSignal API",
        description: "Public API documentation for external developers."
    })
);

router.use("/public", publicRouter);
router.use("/internal", internalRouter);

export default router;
