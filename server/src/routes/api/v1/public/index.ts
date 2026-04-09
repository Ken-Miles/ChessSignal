import { Router } from "express";

import announcementRouter from "../../public/announcement";
import profileRouter from "../../public/profile";
import archivedGameRouter from "../../public/archivedGame";
import chessComRouter from "../../public/chessCom";
import newsArticlesRouter from "../../public/news/articles";
import newsPagesRouter from "../../public/news/pages";

const router = Router();

router.use("/public",
    announcementRouter,
    profileRouter,
    archivedGameRouter,
    chessComRouter,
    newsArticlesRouter,
    newsPagesRouter
);

export default router;
