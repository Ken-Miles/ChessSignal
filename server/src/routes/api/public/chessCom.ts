import { Router } from "express";
import { StatusCodes } from "http-status-codes";

const router = Router();

router.get("/chess-com/callback/:gameType/game/:gameId", async (req, res) => {
    void req;

    return res.sendStatus(StatusCodes.NOT_FOUND);
});

router.get("/chess-com/live/game/:liveGameId", async (req, res) => {
    void req;

    return res.sendStatus(StatusCodes.NOT_FOUND);
});

export default router;
