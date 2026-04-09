import { Router } from "express";
import { StatusCodes } from "http-status-codes";

type ChessComGameType = "live" | "daily" | "computer" | "master";

interface ChessComLiveGameMetaResponse {
    id: string;
    legacyId?: number;
    transports?: {
        http?: {
            url?: string;
        };
    };
    href?: string;
}

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

function getChessComAbsoluteUrl(pathOrUrl: string) {
    try {
        const url = new URL(pathOrUrl, "https://www.chess.com");

        if (url.hostname != "www.chess.com") {
            return;
        }

        return url.toString();
    } catch {
        return;
    }
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

router.get("/chess-com/live/game/:liveGameId", async (req, res) => {
    const liveGameId = req.params.liveGameId;

    if (!liveGameId) {
        return res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    try {
        const forwardHeaders = getForwardHeaders(req.headers);

        const metadataResponse = await fetch(
            `https://www.chess.com/service/play/games/${liveGameId}`,
            {
                headers: forwardHeaders
            }
        );

        if (!metadataResponse.ok) {
            return res.sendStatus(metadataResponse.status);
        }

        const metadata = await metadataResponse.json() as ChessComLiveGameMetaResponse;
        const transportPath = metadata.transports?.http?.url || metadata.href;

        if (!transportPath) {
            return res.sendStatus(StatusCodes.BAD_GATEWAY);
        }

        const transportUrl = getChessComAbsoluteUrl(transportPath);
        if (!transportUrl) {
            return res.sendStatus(StatusCodes.BAD_REQUEST);
        }

        const stateResponse = await fetch(transportUrl, {
            headers: forwardHeaders
        });

        if (!stateResponse.ok) {
            return res.sendStatus(stateResponse.status);
        }

        const state = await stateResponse.json();

        return res.status(StatusCodes.OK).json({
            metadata,
            state
        });
    } catch {
        return res.sendStatus(StatusCodes.BAD_GATEWAY);
    }
});

export default router;