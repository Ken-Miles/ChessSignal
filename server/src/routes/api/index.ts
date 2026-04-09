import { Router } from "express";

import v1Router from "./v1";
import publicApiRouter from "./public";
import accountRouter from "./account";
import analyseRouter from "./analysis/analyse";
import archiveRouter from "./analysis/archive";

const router = Router();

router.use("/api",
    v1Router,
    publicApiRouter,
    accountRouter,
    analyseRouter,
    archiveRouter
);

export default router;