import { z } from "zod";

export const moveSchema = z.object({
    san: z.string(),
    uci: z.string(),
    clock: z.object({
        spentMs: z.number().nonnegative().optional(),
        remainingMs: z.number().nonnegative().optional()
    }).optional()
});

export type Move = z.infer<typeof moveSchema>;

export default Move;