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
const CHESS_COM_TIMEOUT_MS = 10_000;
const isProductionMode = process.env.NODE_ENV == "production";
const allowedForwardRequestHeaders = new Set([
    "accept",
    "accept-language",
    "user-agent",
    "if-none-match",
    "if-modified-since",
    "cache-control",
    "pragma"
]);
const chessComGameTypes = new Set<ChessComGameType>([
    "live",
    "daily",
    "computer",
    "master"
]);

function getForwardHeaders(headers: Record<string, string | string[] | undefined>) {
    const forwarded: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
        const normalisedKey = key.toLowerCase();

        if (!allowedForwardRequestHeaders.has(normalisedKey)) continue;
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

async function fetchWithTimeout(url: string, headers: Record<string, string>) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHESS_COM_TIMEOUT_MS);

    try {
        return await fetch(url, {
            headers,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

router.get("/chess-com/callback/:gameType/game/:gameId", async (req, res) => {
    if (isProductionMode) {
        return res.sendStatus(StatusCodes.NOT_FOUND);
    }

    const gameType = req.params.gameType as ChessComGameType;
    const gameId = req.params.gameId;

    if (!gameType || !gameId || !chessComGameTypes.has(gameType)) {
        return res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    try {
        const forwardHeaders = getForwardHeaders(req.headers);

        const response = await fetchWithTimeout(
            `https://www.chess.com/callback/${gameType}/game/${gameId}`,
            forwardHeaders
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
    if (isProductionMode) {
        return res.sendStatus(StatusCodes.NOT_FOUND);
    }

    const liveGameId = req.params.liveGameId;

    if (!liveGameId) {
        return res.sendStatus(StatusCodes.BAD_REQUEST);
    }

    try {
        const forwardHeaders = getForwardHeaders(req.headers);

        const metadataResponse = await fetchWithTimeout(
            `https://www.chess.com/service/play/games/${liveGameId}`,
            forwardHeaders
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

        const stateResponse = await fetchWithTimeout(transportUrl, forwardHeaders);

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