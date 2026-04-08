import { Router } from "express";
import { StatusCodes } from "http-status-codes";

type ChessComGameType = "live" | "daily" | "computer" | "master";

const router = Router();

const blockedRequestHeaders = new Set([
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "te",
    "trailer",
    "upgrade",
    "proxy-connection"
]);

function getForwardHeaders(headers: Record<string, string | string[] | undefined>) {
    const forwarded: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        const normalisedKey = key.toLowerCase();

        if (blockedRequestHeaders.has(normalisedKey)) continue;
        if (value == undefined) continue;

        forwarded[normalisedKey] = Array.isArray(value)
            ? value.join(", ")
            : value;
    }

    return forwarded;
}

router.get("/chess-com/callback/:gameType/game/:gameId", async (req, res) => {
    const gameType = req.params.gameType as ChessComGameType;
    const gameId = req.params.gameId;

    if (!gameType || !gameId) {
        return res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    try {
        const forwardHeaders = getForwardHeaders(req.headers);

        const response = await fetch(
            `https://www.chess.com/callback/${gameType}/game/${gameId}`,
            {
                headers: forwardHeaders
            }
        );

        const body = await response.text();

        res.status(response.status);

        const contentType = response.headers.get("content-type");
        if (contentType) {
            res.setHeader("Content-Type", contentType);
        }

        res.send(body);
    } catch {
        res.sendStatus(StatusCodes.BAD_GATEWAY);
    }
});

export default router;