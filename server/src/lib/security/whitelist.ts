import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import dotenv from "dotenv";

dotenv.config();

function getHostnameRegex(hostnamePattern: string) {
    const trimmedPattern = hostnamePattern.trim().toLowerCase();

    if (!trimmedPattern) {
        return;
    }

    if (trimmedPattern.startsWith("*.")) {
        const domain = trimmedPattern.slice(2).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`^(.+\\.)?${domain}$`);
    }

    const exactHost = trimmedPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${exactHost}$`);
}

const envWhitelistedHostnames = (process.env.HOSTNAME_WHITELIST || "")
    .split(",")
    .map(getHostnameRegex)
    .filter((value): value is RegExp => value != undefined);

const whitelistedHostnames = [
    /^(.+\.)?chesssignal\.aidenpearce\.space$/,
    /localhost/,
    /127\.0\.0\.1/,
    ...envWhitelistedHostnames
];

const hostnameWhitelist: RequestHandler = (req, res, next) => {
    const hostWhitelisted = whitelistedHostnames.some(
        hostnameRegex => hostnameRegex.test(req.hostname)
    );

    if (!hostWhitelisted) {
        return res.sendStatus(StatusCodes.UNAUTHORIZED);
    }

    next();
};

export default hostnameWhitelist;