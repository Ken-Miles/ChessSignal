import { Request, RequestHandler, Response } from "express";
import { readFileSync } from "fs";
import { resolve } from "path";

import { PageMeta, renderPageTemplate } from "@/lib/pageTemplate";

type PlaceholderGenerator = (req: Request, res: Response) => (
    Promise<Record<string, string>>
);

type MetaGenerator = (req: Request, res: Response) => (
    Promise<PageMeta> | PageMeta
);

interface AppPageRouterOptions {
    bundleName: string;
    meta: PageMeta | MetaGenerator;
}

function isAppPageRouterOptions(
    value: string | AppPageRouterOptions
): value is AppPageRouterOptions {
    return typeof value != "string";
}

function appRouter(
    filepath: string | AppPageRouterOptions,
    getPlaceholders?: PlaceholderGenerator
): RequestHandler {
    if (isAppPageRouterOptions(filepath)) {
        return async (req, res) => {
            const meta = typeof filepath.meta == "function"
                ? await filepath.meta(req, res)
                : filepath.meta;

            const htmlContent = renderPageTemplate(req, {
                bundleName: filepath.bundleName,
                meta
            });

            res.setHeader("Content-Type", "text/html");
            res.send(htmlContent);
        };
    }

    if (!getPlaceholders) {
        return async (req, res) => res.sendFile(
            resolve(`client/public/apps/${filepath}`)
        );
    }

    return async (req, res) => {
        const placeholders = Object.entries(
            await getPlaceholders(req, res)
        );

        let htmlContent = readFileSync(
            `client/public/apps/${filepath}`, "utf-8"
        );

        for (const [ key, value ] of placeholders) {
            htmlContent = htmlContent.replace(
                new RegExp(`\\\${${key}}`, "gi"), value
            );
        }

        res.setHeader("Content-Type", "text/html");

        res.send(htmlContent);
    };
}

export default appRouter;