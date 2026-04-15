import { Chess } from "chess.js";

import Game from "shared/types/game/Game";

import iconDefaultProfileImage from "@assets/img/defaultprofileimage.png";

type ChessComProfileResponse = {
    avatar?: string;
    status?: string;
    country?: string;
};

type ChessComCountryResponse = {
    code?: string;
    name?: string;
};

export type ChessComProfileDetails = {
    image: string;
    status?: string;
    countryCode?: string;
    countryName?: string;
};

const chessComCountryRequestCache = new Map<string, Promise<{
    countryCode?: string;
    countryName?: string;
}>>();

async function getChessComCountryDetails(countryUrl?: string) {
    if (!countryUrl) {
        return {};
    }

    const cachedRequest = chessComCountryRequestCache.get(countryUrl);
    if (cachedRequest) {
        return cachedRequest;
    }

    const countryRequest = (async () => {
        try {
            const countryResponse = await fetch(countryUrl);

            if (!countryResponse.ok) {
                return {};
            }

            const country = await countryResponse.json() as ChessComCountryResponse;

            return {
                countryCode: country.code?.toLowerCase(),
                countryName: country.name
            };
        } catch {
            return {};
        }
    })();

    chessComCountryRequestCache.set(countryUrl, countryRequest);

    return await countryRequest;
}

export function isGameFromChessCom(game: Game) {
    const board = new Chess();
    board.loadPgn(game.pgn);

    const headers = board.getHeaders();

    return headers["Site"] == "Chess.com";
}

async function fetchChessComProfileDetails(
    username: string
): Promise<ChessComProfileDetails> {
    if (!username) return { image: iconDefaultProfileImage };

    try {
        const profileResponse = await fetch(
            `https://api.chess.com/pub/player/${username}`
        );

        if (!profileResponse.ok) {
            return { image: iconDefaultProfileImage };
        }

        const profile = await profileResponse.json() as ChessComProfileResponse;

        const countryDetails = await getChessComCountryDetails(profile.country);

        return {
            image: profile.avatar || iconDefaultProfileImage,
            status: profile.status,
            countryCode: countryDetails.countryCode,
            countryName: countryDetails.countryName
        };
    } catch {
        return { image: iconDefaultProfileImage };
    }
}

export async function getChessComProfileImage(
    username: string
): Promise<string> {
    return (await fetchChessComProfileDetails(username)).image;
}

export async function getChessComProfileDetails(
    username: string
): Promise<ChessComProfileDetails> {
    return await fetchChessComProfileDetails(username);
}

export async function getChessComProfileImages(game: Game) {
    const board = new Chess();
    board.loadPgn(game.pgn);

    const headers = board.getHeaders();

    const [ white, black ] = await Promise.all([
        fetchChessComProfileDetails(headers["White"]),
        fetchChessComProfileDetails(headers["Black"])
    ]);

    return {
        white: white.image,
        black: black.image
    };
}