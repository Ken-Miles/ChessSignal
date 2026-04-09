type ApiVisibility = "public" | "internal";

type ApiMethod = "get" | "post";

interface ApiParameterDocumentation {
    name: string;
    in: "path" | "query";
    required?: boolean;
    description: string;
}

interface ApiResponseDocumentation {
    status: number;
    description: string;
}

interface ApiRouteDocumentation {
    visibility: ApiVisibility;
    method: ApiMethod;
    path: string;
    summary: string;
    description: string;
    parameters?: ApiParameterDocumentation[];
    requestBodyDescription?: string;
    responses: ApiResponseDocumentation[];
}

export interface OpenApiDocumentOptions {
    apiBasePath: string;
    includeInternal: boolean;
    title: string;
    description: string;
}

interface DocsPageOptions extends OpenApiDocumentOptions {
    docsPath: string;
}

const routeDocs: ApiRouteDocumentation[] = [
    {
        visibility: "public",
        method: "get",
        path: "/public/announcement",
        summary: "Get the latest announcement",
        description: "Returns the currently published announcement, or 404 when none exists.",
        responses: [
            { status: 200, description: "Announcement payload." },
            { status: 404, description: "No announcement is currently published." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/profile/{username}",
        summary: "Get a public user profile",
        description: "Looks up a user by username and returns the public profile record.",
        parameters: [
            {
                name: "username",
                in: "path",
                required: true,
                description: "Public username to look up."
            }
        ],
        responses: [
            { status: 200, description: "Public profile payload." },
            { status: 404, description: "The user was not found." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/archived-game",
        summary: "Get an archived analysed game",
        description: "Loads a previously archived analysed game by its archive id.",
        parameters: [
            {
                name: "id",
                in: "query",
                required: true,
                description: "Archive id for the analysed game."
            }
        ],
        responses: [
            { status: 200, description: "Archived analysed game payload." },
            { status: 404, description: "The archive entry was not found." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/chess-com/callback/{gameType}/game/{gameId}",
        summary: "Proxy a Chess.com callback payload",
        description: "Forwards Chess.com callback requests while preserving upstream response status and content type.",
        parameters: [
            {
                name: "gameType",
                in: "path",
                required: true,
                description: "Chess.com game type such as live, daily, computer, or master."
            },
            {
                name: "gameId",
                in: "path",
                required: true,
                description: "Chess.com game identifier."
            }
        ],
        responses: [
            { status: 200, description: "Upstream Chess.com callback body." },
            { status: 502, description: "The upstream service could not be reached." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/chess-com/live/game/{liveGameId}",
        summary: "Proxy live Chess.com game state",
        description: "Resolves live Chess.com game metadata, follows the transport URL, and returns the current state payload.",
        parameters: [
            {
                name: "liveGameId",
                in: "path",
                required: true,
                description: "Chess.com live game identifier."
            }
        ],
        responses: [
            { status: 200, description: "Live game metadata and state payload." },
            { status: 400, description: "The request did not resolve to a valid Chess.com transport URL." },
            { status: 502, description: "The upstream service could not be reached." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/news",
        summary: "Get news articles or a single article",
        description: "Returns a paginated list of article metadata, or a full article when an id query parameter is provided.",
        parameters: [
            {
                name: "id",
                in: "query",
                description: "Optional article id. When present, the full article is returned."
            },
            {
                name: "page",
                in: "query",
                description: "Optional page number for the paginated listing."
            }
        ],
        responses: [
            { status: 200, description: "Article list or a full article payload." },
            { status: 404, description: "The article was not found." }
        ]
    },
    {
        visibility: "public",
        method: "get",
        path: "/public/news/pages",
        summary: "Get the number of news pages",
        description: "Returns the current number of pages available in the news archive.",
        responses: [
            { status: 200, description: "Page count as a number." }
        ]
    },
    {
        visibility: "internal",
        method: "post",
        path: "/internal/login",
        summary: "Create an internal session",
        description: "Validates the internal password and sets the internal session cookie.",
        requestBodyDescription: "Plain text password body.",
        responses: [
            { status: 200, description: "Internal session cookie was created." },
            { status: 401, description: "The password was invalid." }
        ]
    },
    {
        visibility: "internal",
        method: "post",
        path: "/internal/announcement/publish",
        summary: "Publish or clear the announcement",
        description: "Creates, updates, or removes the currently published announcement.",
        requestBodyDescription: "JSON announcement payload, or an empty object to clear the announcement.",
        responses: [
            { status: 200, description: "The announcement was saved or deleted." },
            { status: 400, description: "The announcement payload was invalid." }
        ]
    },
    {
        visibility: "internal",
        method: "post",
        path: "/internal/news/publish",
        summary: "Publish a news article",
        description: "Creates or updates a news article entry for the internal news feed.",
        requestBodyDescription: "JSON news article payload.",
        responses: [
            { status: 200, description: "The news article was saved." },
            { status: 400, description: "The article payload was invalid." }
        ]
    },
    {
        visibility: "internal",
        method: "post",
        path: "/internal/news/delete",
        summary: "Delete a news article",
        description: "Deletes a news article by id.",
        requestBodyDescription: "JSON body containing an `id` string.",
        responses: [
            { status: 200, description: "The article was deleted." },
            { status: 400, description: "The request body was invalid." },
            { status: 404, description: "No article matched the given id." }
        ]
    }
];

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}

function getVisibleRoutes(includeInternal: boolean) {
    return routeDocs.filter(route => route.visibility == "public" || includeInternal);
}

function getOpenApiResponses(route: ApiRouteDocumentation) {
    return Object.fromEntries(route.responses.map(response => [
        response.status,
        { description: response.description }
    ]));
}

function buildParameters(route: ApiRouteDocumentation) {
    return route.parameters?.map(parameter => ({
        name: parameter.name,
        in: parameter.in,
        required: parameter.required ?? parameter.in == "path",
        description: parameter.description,
        schema: { type: "string" }
    }));
}

export function buildOpenApiDocument(options: OpenApiDocumentOptions) {
    const visibleRoutes = getVisibleRoutes(options.includeInternal);
    const paths: Record<string, Record<string, unknown>> = {};

    for (const route of visibleRoutes) {
        if (!paths[route.path]) {
            paths[route.path] = {};
        }

        paths[route.path][route.method] = {
            summary: route.summary,
            description: route.description,
            tags: [route.visibility],
            parameters: buildParameters(route),
            requestBody: route.requestBodyDescription
                ? {
                    description: route.requestBodyDescription,
                    required: true,
                    content: {
                        "application/json": {
                            schema: { type: "object" }
                        }
                    }
                }
                : undefined,
            responses: getOpenApiResponses(route)
        };
    }

    return {
        openapi: "3.1.0",
        info: {
            title: options.title,
            description: options.description,
            version: "v1"
        },
        servers: [
            { url: options.apiBasePath }
        ],
        tags: [
            {
                name: "public",
                description: "Public API endpoints."
            },
            {
                name: "internal",
                description: "Internal endpoints for maintainers."
            }
        ],
        paths
    };
}

function renderRouteList(routes: ApiRouteDocumentation[], apiBasePath: string) {
    return routes.map(route => `
        <article class="route-card route-card--${route.visibility}">
            <div class="route-card__header">
                <span class="badge badge--${route.method}">${escapeHtml(route.method.toUpperCase())}</span>
                <code>${escapeHtml(apiBasePath + route.path)}</code>
            </div>
            <h2>${escapeHtml(route.summary)}</h2>
            <p>${escapeHtml(route.description)}</p>
            ${route.requestBodyDescription ? `<p><strong>Request body:</strong> ${escapeHtml(route.requestBodyDescription)}</p>` : ""}
            ${route.parameters?.length ? `
                <ul>
                    ${route.parameters.map(parameter => `
                        <li><strong>${escapeHtml(parameter.name)}</strong> (${escapeHtml(parameter.in)}) - ${escapeHtml(parameter.description)}</li>
                    `).join("")}
                </ul>
            ` : ""}
            <p><strong>Responses:</strong> ${escapeHtml(route.responses.map(response => `${response.status} ${response.description}`).join(" | "))}</p>
        </article>
    `).join("");
}

export function renderApiDocsHtml(options: DocsPageOptions) {
    const visibleRoutes = getVisibleRoutes(options.includeInternal);
    const publicRoutes = visibleRoutes.filter(route => route.visibility == "public");
    const internalRoutes = visibleRoutes.filter(route => route.visibility == "internal");

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(options.title)}</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #0c1117;
            --panel: #111a24;
            --panel-border: #243041;
            --text: #e7edf5;
            --muted: #9ca9b8;
            --accent: #88c0ff;
            --public: #2e8b57;
            --internal: #8b5cf6;
            --get: #3b82f6;
            --post: #f59e0b;
        }

        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: radial-gradient(circle at top, rgba(53, 84, 133, 0.35), transparent 40%), var(--bg);
            color: var(--text);
        }

        main {
            max-width: 1080px;
            margin: 0 auto;
            padding: 48px 20px 72px;
        }

        .hero {
            display: grid;
            gap: 18px;
            margin-bottom: 28px;
            padding-bottom: 28px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hero h1 {
            margin: 0;
            font-size: clamp(2rem, 5vw, 3.6rem);
            letter-spacing: -0.04em;
        }

        .hero p {
            margin: 0;
            max-width: 70ch;
            color: var(--muted);
            line-height: 1.6;
        }

        .stats {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .stat {
            padding: 10px 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.03);
            color: var(--muted);
        }

        .section {
            margin-top: 32px;
        }

        .section h2 {
            margin: 0 0 16px;
            font-size: 1.5rem;
        }

        .route-list {
            display: grid;
            gap: 16px;
        }

        .route-card {
            padding: 18px 20px;
            border: 1px solid var(--panel-border);
            border-radius: 20px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
            box-shadow: 0 18px 60px rgba(0, 0, 0, 0.24);
        }

        .route-card h2 {
            margin: 12px 0 10px;
            font-size: 1.2rem;
        }

        .route-card p, .route-card li {
            color: var(--muted);
            line-height: 1.55;
        }

        .route-card ul {
            margin: 12px 0 0;
            padding-left: 18px;
        }

        .route-card__header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 5px 10px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
        }

        .badge--GET { background: rgba(59, 130, 246, 0.18); color: var(--get); }
        .badge--POST { background: rgba(245, 158, 11, 0.18); color: var(--post); }
        .route-card--public { border-color: rgba(46, 139, 87, 0.35); }
        .route-card--internal { border-color: rgba(139, 92, 246, 0.35); }

        code {
            font-size: 0.95rem;
            color: var(--accent);
            word-break: break-all;
        }

        .footer {
            margin-top: 28px;
            color: var(--muted);
            font-size: 0.95rem;
        }
    </style>
</head>
<body>
    <main>
        <section class="hero">
            <div>
                <h1>${escapeHtml(options.title)}</h1>
                <p>${escapeHtml(options.description)}</p>
            </div>
            <div class="stats">
                <span class="stat">Base path: ${escapeHtml(options.apiBasePath)}</span>
                <span class="stat">Docs endpoint: ${escapeHtml(options.docsPath)}</span>
                <span class="stat">Public routes: ${publicRoutes.length}</span>
                <span class="stat">Internal routes: ${internalRoutes.length}</span>
            </div>
        </section>

        <section class="section">
            <h2>Public endpoints</h2>
            <div class="route-list">
                ${renderRouteList(publicRoutes, options.apiBasePath)}
            </div>
        </section>

        ${options.includeInternal ? `
            <section class="section">
                <h2>Internal endpoints</h2>
                <div class="route-list">
                    ${renderRouteList(internalRoutes, options.apiBasePath)}
                </div>
            </section>
        ` : ""}

        <p class="footer">This page is generated from route metadata in the server source tree.</p>
    </main>
</body>
</html>`;
}
