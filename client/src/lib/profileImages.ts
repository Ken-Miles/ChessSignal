import { Chess } from "chess.js";

import Game from "shared/types/game/Game";

import iconDefaultProfileImage from "@assets/img/defaultprofileimage.png";

type ChessComProfileResponse = {
    avatar?: string;
    status?: string;
};

export type ChessComProfileDetails = {
    image: string;
    status?: string;
};

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

        return {
            image: profile.avatar || iconDefaultProfileImage,
            status: profile.status
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