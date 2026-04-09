import { Router } from "express";

import {
    buildOpenApiDocument,
    renderApiDocsHtml,
    type OpenApiDocumentOptions
} from "./documentation";

interface ApiDocsRouterOptions extends OpenApiDocumentOptions {
    title: string;
    description: string;
}

function createApiDocsRouter(options: ApiDocsRouterOptions) {
    const router = Router();

    router.get("/openapi.json", (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.json(buildOpenApiDocument(options));
    });

    router.get("/docs", (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "text/html");
        res.send(renderApiDocsHtml({
            ...options,
            docsPath: `${req.baseUrl}/docs`
        }));
    });

    return router;
}

export default createApiDocsRouter;
