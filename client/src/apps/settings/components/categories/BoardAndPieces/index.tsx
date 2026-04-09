import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import useSettingsStore, { defaultSettings } from "@/stores/SettingsStore";
import ColourSwatch from "@/components/settings/ColourSwatch";
import Button from "@/components/common/Button";
import Separator from "@/components/common/Separator";

import * as categoryStyles from "../Category.module.css";
import * as styles from "./BoardAndPieces.module.css";

import iconInterfaceDelete from "@assets/img/interface/delete.svg";

const boardTextureThemes = [
    "8_bit",
    "bases",
    "blue",
    "brown",
    "bubblegum",
    "burled_wood",
    "checkers",
    "dash",
    "glass",
    "graffiti",
    "green",
    "icy_sea",
    "light",
    "lolz",
    "marble",
    "metal",
    "neon",
    "newspaper",
    "orange",
    "overlay",
    "parchment",
    "purple",
    "red",
    "sand",
    "sky",
    "stone",
    "tan",
    "tournament",
    "translucent",
    "walnut"
];

const pieceSetThemes = [
    "neo",
    "neo_angle",
    "game_room",
    "wood",
    "glass",
    "gothic",
    "classic",
    "metal",
    "bases",
    "neo_wood",
    "icy_sea",
    "club",
    "ocean",
    "newspaper",
    "blindfold",
    "space",
    "cases",
    "condal",
    "8_bit",
    "marble",
    "book",
    "alpha",
    "bubblegum",
    "dash",
    "graffiti",
    "light",
    "lolz",
    "luca",
    "maya",
    "modern",
    "nature",
    "neon",
    "sky",
    "tigers",
    "tournament",
    "vintage",
    "3d___wood",
    "3d___staunton",
    "3d___plastic",
    "3d___chesskid",
    "real_3d"
];

const presetThemes = [
    "Green",
    "Wood",
    "Green_Angle",
    "Wood_Angle",
    "Blue",
    "Pink",
    "Blue_Angle",
    "Pink_Angle",
    "Game_Room",
    "Classic",
    "Light",
    "Dark_Wood",
    "Glass",
    "Tournament",
    "Staunton",
    "Newspaper",
    "Tigers",
    "Nature",
    "Bluesky",
    "Cosmos",
    "Ocean",
    "Metal",
    "Gothic",
    "Marble",
    "Neon",
    "Graffiti",
    "Bubblegum",
    "Lolz",
    "8_Bit",
    "Bases",
    "Blues",
    "Dash",
    "Icy_Sea",
    "Walnut",
    "Checkers",
    "Esports_World_Cup",
    "Sports_American_Football",
    "Chess_The_Musical"
];

const appBackgroundThemes = [
    "8_Bit.jpg",
    "Bases.jpg",
    "Blues.jpg",
    "Bots_Martin_s_Family.png",
    "Bubblegum.png",
    "Chess_The_Musical.png",
    "Classic.jpeg",
    "Cosmos.png",
    "Dash.jpg",
    "Game_Room.png",
    "Glass.png",
    "Gothic.png",
    "Graffiti.png",
    "Icy_Sea.png",
    "Light.png",
    "Lolz.png",
    "Marble.png",
    "Metal.png",
    "Nature.png",
    "Neon.png",
    "Newspaper.png",
    "Ocean.png",
    "Sky.png",
    "Standard.png",
    "Staunton.png",
    "Tigers.png",
    "Tournament.png",
    "Walnut.jpg",
    "Wood.png"
];

function formatThemeLabel(value: string) {
    return value
        .replace(/\.[^.]+$/, "")
        .replace(/___/g, " - ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeThemeKey(value: string) {
    return value
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function buildThemeLookup(values: string[]) {
    const lookup = new Map<string, string>();

    for (const value of values) {
        const key = normalizeThemeKey(value);

        if (!lookup.has(key)) {
            lookup.set(key, value);
        }
    }

    return lookup;
}

const pieceSetThemeLookup = buildThemeLookup(pieceSetThemes);
const boardTextureThemeLookup = buildThemeLookup(boardTextureThemes);
const appBackgroundThemeLookup = buildThemeLookup(appBackgroundThemes);

const classicThemeDefaults = {
    piece: "classic",
    boardTexture: "brown",
    appBackground: "Classic.jpeg"
};

const presetThemeFallbacks: Record<string, {
    piece?: string;
    boardTexture?: string;
    appBackground?: string;
}> = {
    Green: { piece: "classic", boardTexture: "green", appBackground: "Classic.jpeg" },
    Wood: { piece: "classic", boardTexture: "brown", appBackground: "Wood.png" },
    Green_Angle: { piece: "classic", boardTexture: "green", appBackground: "Classic.jpeg" },
    Wood_Angle: { piece: "classic", boardTexture: "brown", appBackground: "Wood.png" },
    Blue: { piece: "classic", boardTexture: "blue", appBackground: "Blues.jpg" },
    Pink: { piece: "classic", boardTexture: "red", appBackground: "Classic.jpeg" },
    Blue_Angle: { piece: "classic", boardTexture: "blue", appBackground: "Blues.jpg" },
    Pink_Angle: { piece: "classic", boardTexture: "red", appBackground: "Classic.jpeg" },
    Game_Room: { boardTexture: "brown", appBackground: "Game_Room.png" },
    Classic: { piece: "classic", boardTexture: "brown", appBackground: "Classic.jpeg" },
    Dark_Wood: { piece: "wood", boardTexture: "brown", appBackground: "Wood.png" },
    Blues: { piece: "classic", boardTexture: "translucent", appBackground: "Blues.jpg" },
    Esports_World_Cup: { piece: "classic", boardTexture: "brown", appBackground: "Classic.jpeg" },
    Sports_American_Football: { piece: "classic", boardTexture: "green", appBackground: "Classic.jpeg" },
    Chess_The_Musical: { piece: "classic", boardTexture: "brown", appBackground: "Chess_The_Musical.png" }
};

function BoardAndPieces() {
    const { t } = useTranslation(["settings", "common"]);

    const { settings, setSettings } = useSettingsStore();

    const [
        lightSquareColourSwatchOpen,
        setLightSquareColourSwatchOpen
    ] = useState(false);

    const [
        darkSquareColourSwatchOpen,
        setDarkSquareColourSwatchOpen
    ] = useState(false);

    function setBoardColours(light: string, dark: string) {
        setSettings(draft => {
            draft.themes.board.lightSquareColour = light;
            draft.themes.board.darkSquareColour = dark;
            draft.themes.preset = "";

            return draft;
        });
    }

    return <div
        className={categoryStyles.wrapper}
        onClick={event => {
            setLightSquareColourSwatchOpen(false);
            setDarkSquareColourSwatchOpen(false);

            event.stopPropagation();
        }}
    >
        <b className={categoryStyles.header}>
            {t("boardAndPieces.boardColour")}
        </b>

        <Separator className={categoryStyles.separator} />

        <div className={categoryStyles.setting}>
            <span>
                {t("boardAndPieces.lightSquareColour")}
            </span>

            <ColourSwatch
                colour={settings.themes.board.lightSquareColour}
                onColourChange={colour => {
                    setSettings(draft => {
                        draft.themes.board.lightSquareColour = colour;
                        draft.themes.preset = "";
                        return draft;
                    });
                }}
                open={lightSquareColourSwatchOpen}
                onToggle={setLightSquareColourSwatchOpen}
            />
        </div>

        <div className={categoryStyles.setting}>
            <span>
                {t("boardAndPieces.darkSquareColour")}
            </span>

            <ColourSwatch
                colour={settings.themes.board.darkSquareColour}
                onColourChange={colour => {
                    setSettings(draft => {
                        draft.themes.board.darkSquareColour = colour;
                        draft.themes.preset = "";
                        return draft;
                    });
                }}
                open={darkSquareColourSwatchOpen}
                onToggle={setDarkSquareColourSwatchOpen}
            />
        </div>

        <Button
            icon={iconInterfaceDelete}
            onClick={() => setBoardColours(
                defaultSettings.themes.board.lightSquareColour,
                defaultSettings.themes.board.darkSquareColour
            )}
        >
            {t("reset", { ns: "common" })}
        </Button>

        <b className={categoryStyles.subheader}>
            {t("boardAndPieces.presetsTitle")}
        </b>

        <div className={styles.assetGrid}>
            {presetThemes.map(preset => <button
                key={preset}
                className={`${styles.assetCard} ${settings.themes.preset == preset
                    ? styles.assetCardSelected
                    : ""
                }`}
                title={formatThemeLabel(preset)}
                onClick={() => setSettings(draft => {
                    draft.themes.preset = preset;

                    const presetKey = normalizeThemeKey(preset);
                    const fallback = presetThemeFallbacks[preset] || {};

                    const matchingPiece = pieceSetThemeLookup.get(presetKey)
                        || fallback.piece
                        || classicThemeDefaults.piece;
                    draft.themes.piece = matchingPiece;

                    const matchingTexture = boardTextureThemeLookup.get(presetKey)
                        || fallback.boardTexture
                        || classicThemeDefaults.boardTexture;
                    draft.themes.board.texture = matchingTexture;

                    const matchingBackground = appBackgroundThemeLookup.get(presetKey)
                        || fallback.appBackground
                        || classicThemeDefaults.appBackground;
                    draft.themes.appBackground = matchingBackground;

                    return draft;
                })}
            >
                <div className={styles.assetPreviewStack}>
                    <img
                        src={`/img/chessboards/presets/${preset}/board_preview.png`}
                        className={styles.assetPreviewLayer}
                    />

                    <img
                        src={`/img/chessboards/presets/${preset}/pieces_preview.png`}
                        className={styles.assetPreviewLayer}
                    />
                </div>

                <span className={styles.assetLabel}>
                    {formatThemeLabel(preset)}
                </span>
            </button>)}
        </div>

        <b className={categoryStyles.subheader}>
            {t("boardAndPieces.pieceStyle", {
                defaultValue: "Piece Style"
            })}
        </b>

        <div className={styles.assetGrid}>
            {pieceSetThemes.map(pieceSet => <button
                key={pieceSet}
                className={`${styles.assetCard} ${settings.themes.piece == pieceSet
                    ? styles.assetCardSelected
                    : ""
                }`}
                title={formatThemeLabel(pieceSet)}
                onClick={() => setSettings(draft => {
                    draft.themes.piece = pieceSet;
                    draft.themes.preset = "";

                    return draft;
                })}
            >
                <img
                    src={`/img/pieces/chessglyphs/${pieceSet}/wn.png`}
                    className={styles.assetPreview}
                />

                <span className={styles.assetLabel}>
                    {formatThemeLabel(pieceSet)}
                </span>
            </button>)}
        </div>

        <b className={categoryStyles.subheader}>
            {t("boardAndPieces.boardTexture", {
                defaultValue: "Board Texture"
            })}
        </b>

        <div className={styles.assetGrid}>
            {boardTextureThemes.map(texture => <button
                key={texture}
                className={`${styles.assetCard} ${settings.themes.board.texture == texture
                    ? styles.assetCardSelected
                    : ""
                }`}
                title={formatThemeLabel(texture)}
                onClick={() => setSettings(draft => {
                    draft.themes.board.texture = texture;
                    draft.themes.preset = "";

                    return draft;
                })}
            >
                <img
                    src={`/img/chessboards/boards/${texture}.png`}
                    className={styles.assetPreview}
                />

                <span className={styles.assetLabel}>
                    {formatThemeLabel(texture)}
                </span>
            </button>)}
        </div>

        <Button
            icon={iconInterfaceDelete}
            onClick={() => setSettings(draft => {
                draft.themes.piece = defaultSettings.themes.piece;
                draft.themes.board.texture = defaultSettings.themes.board.texture;
                draft.themes.preset = defaultSettings.themes.preset;

                return draft;
            })}
        >
            {t("boardAndPieces.resetVisuals", {
                defaultValue: "Reset Piece and Texture"
            })}
        </Button>

        <b className={categoryStyles.subheader}>
            {t("boardAndPieces.appBackgroundTheme", {
                defaultValue: "Application Background"
            })}
        </b>

        <div className={styles.assetGrid}>
            {appBackgroundThemes.map(themeFile => <button
                key={themeFile}
                className={`${styles.assetCard} ${settings.themes.appBackground == themeFile
                    ? styles.assetCardSelected
                    : ""
                }`}
                title={formatThemeLabel(themeFile)}
                onClick={() => setSettings(draft => {
                    draft.themes.appBackground = themeFile;

                    return draft;
                })}
            >
                <img
                    src={`/img/chessboards/themes/${themeFile}`}
                    className={`${styles.assetPreview} ${styles.assetPreviewWide}`}
                />

                <span className={styles.assetLabel}>
                    {formatThemeLabel(themeFile)}
                </span>
            </button>)}
        </div>

        <Button
            icon={iconInterfaceDelete}
            onClick={() => setSettings(draft => {
                draft.themes.appBackground = defaultSettings.themes.appBackground;

                return draft;
            })}
        >
            {t("boardAndPieces.resetBackground", {
                defaultValue: "Reset Background"
            })}
        </Button>
    </div>;
}

export default BoardAndPieces;