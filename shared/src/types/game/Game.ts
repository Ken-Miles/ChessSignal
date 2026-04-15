import z from "zod";
import { validateFen } from "chess.js";

import TimeControl from "@/constants/game/TimeControl";
import Variant from "@/constants/game/Variant";
import PieceColour from "@/constants/PieceColour";
import { gamePlayerProfileSchema } from "./GamePlayerProfile";

export interface GameSourceMetadata {
    chessCom?: {
        gameId?: string;
        gameType?: string;
        timeClass?: string;
        gameUrl?: string;
        gameEndReason?: string;
        liveGameId?: string;
        legacyGameId?: string;
        isLiveOngoing?: boolean;
        liveCurrentClocksMs?: {
            whiteMs?: number;
            blackMs?: number;
        };
        clockBaseMs?: number;
        moveTimestampsMs?: number[];
    };
}

export function getColourPlayed(game: Game, username: string) {
    return (
        game.players.white.username?.toLowerCase()
        == username.toLowerCase()
    ) ? PieceColour.WHITE : PieceColour.BLACK;
}

export const gameSchema = z.object({
    pgn: z.string(),
    initialPosition: z.string().refine(
        pos => validateFen(pos).ok
    ),
    timeControl: z.enum(TimeControl).optional(),
    variant: z.enum(Variant),
    players: z.object({
        white: gamePlayerProfileSchema,
        black: gamePlayerProfileSchema
    }),
    date: z.iso.datetime().optional(),
    source: z.object({
        chessCom: z.object({
            gameId: z.string().optional(),
            gameType: z.string().optional(),
            timeClass: z.string().optional(),
            gameUrl: z.string().optional(),
            gameEndReason: z.string().optional(),
            liveGameId: z.string().optional(),
            legacyGameId: z.string().optional(),
            isLiveOngoing: z.boolean().optional(),
            liveCurrentClocksMs: z.object({
                whiteMs: z.number().optional(),
                blackMs: z.number().optional()
            }).optional(),
            clockBaseMs: z.number().optional(),
            moveTimestampsMs: z.number().array().optional()
        }).optional()
    }).optional()
});

export type Game = z.infer<typeof gameSchema> & {
    source?: GameSourceMetadata;
};

export default Game;