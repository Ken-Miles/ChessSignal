interface PageDocumentProps {
    title: string;
    description?: string;
    ogTitle: string;
    ogDescription?: string;
    ogImage: string;
    ogUrl: string;
    themeColor: string;
    robots?: string;
    bundleSrc: string;
}

function PageDocument({
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    themeColor,
    robots,
    bundleSrc
}: PageDocumentProps) {
    return <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            />
            <meta
                httpEquiv="Content-Type"
                content="text/html; charset=UTF-8"
            />

            <title>{title}</title>

            {description && (
                <meta name="description" content={description} />
            )}

            <meta name="og:title" content={ogTitle} />
            <meta name="og:url" content={ogUrl} />
            <meta name="og:image" content={ogImage} />

            {ogDescription && (
                <meta name="og:description" content={ogDescription} />
            )}

            <meta name="theme-color" content={themeColor} />

            {robots && <meta name="robots" content={robots} />}

            <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
            <div className="root"></div>
            <script src={bundleSrc}></script>
        </body>
    </html>;
}

export default PageDocument;
