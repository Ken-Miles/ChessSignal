import { Request } from "express";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PageDocument from "@/lib/PageDocument";

export interface PageMeta {
    title: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    themeColor?: string;
    robots?: string;
}

export interface PageRenderOptions {
    bundleName: string;
    meta: PageMeta;
}

const DEFAULT_OG_IMAGE = "/img/logo.svg";
const DEFAULT_THEME_COLOR = "#47acff";

function isLoopbackHostname(hostname: string) {
    return hostname == "localhost" || hostname == "127.0.0.1";
}

function getOrigin(req: Request) {
    const requestOrigin = `${req.protocol}://${req.get("host")}`;
    const configuredOrigin = process.env.ORIGIN;

    if (!configuredOrigin) return requestOrigin;

    if (process.env.NODE_ENV == "production") {
        try {
            const configuredUrl = new URL(configuredOrigin);
            const requestUrl = new URL(requestOrigin);

            const configuredIsLoopback = isLoopbackHostname(
                configuredUrl.hostname
            );
            const requestIsLoopback = isLoopbackHostname(requestUrl.hostname);

            if (configuredIsLoopback && !requestIsLoopback) {
                return requestOrigin;
            }
        }
        catch {
            return requestOrigin;
        }
    }

    return configuredOrigin;
}

function resolveOgUrl(req: Request, meta: PageMeta) {
    if (meta.ogUrl) return meta.ogUrl;

    return `${getOrigin(req)}${req.originalUrl}`;
}

export function renderPageTemplate(
    req: Request,
    options: PageRenderOptions
) {
    const { meta, bundleName } = options;

    const documentHtml = renderToStaticMarkup(
        React.createElement(PageDocument, {
            title: meta.title,
            description: meta.description,
            ogTitle: meta.ogTitle || meta.title,
            ogDescription: meta.ogDescription || meta.description,
            ogImage: meta.ogImage || DEFAULT_OG_IMAGE,
            ogUrl: resolveOgUrl(req, meta),
            themeColor: meta.themeColor || DEFAULT_THEME_COLOR,
            robots: meta.robots,
            bundleSrc: `/${bundleName}.bundle.js`
        })
    );

    return `<!DOCTYPE html>${documentHtml}`;
}