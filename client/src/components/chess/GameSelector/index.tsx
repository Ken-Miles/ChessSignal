import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { trim } from "lodash-es";

import { Game, getColourPlayed } from "shared/types/game/Game";
import PieceColour from "shared/constants/PieceColour";
import {
    GameSource,
    getGameSource,
    getSelectableGameSources,
    GameSourceType,
    GameSelectorButton
} from "@/components/chess/GameSelector/GameSource";
import useGameSelector from "@/hooks/useGameSelector";
import useAnalysisBoardStore from "@/apps/features/analysis/stores/AnalysisBoardStore";
import Button from "@/components/common/Button";
import FileUploader from "@/components/common/FileUploader";
import GameSearchMenu from "../GameSearchMenu";
import {
    analysisSelectionUrlKeyList,
    getAnalysisSelectionFromUrl,
    isChessComGameUrl,
    updateAnalysisSelectionUrl
} from "@analysis/lib/selectionUrl";
import { parseChessComGameSelectionFromInput } from "@/lib/games/chessCom";

import GameSelectorProps from "./GameSelectorProps";
import * as styles from "./GameSelector.module.css";

import iconInterfaceSearch from "@assets/img/interface/search.svg";
import iconInterfaceUpload from "@assets/img/interface/upload.svg";

const sourcePlaceholderKeys: Record<GameSourceType, string> = {
    PGN: "pgn",
    FEN: "fen",
    CHESS_COM: "chessCom",
    CHESS_COM_LIVE: "chessComLive",
    LICHESS: "lichess"
};

const isProductionMode = process.env.NODE_ENV == "production";

function parseProductionChessComFields(value: string) {
    const chunks = value
        .split(/\r?\n|\|/)
        .map(chunk => chunk.trim())
        .filter(Boolean);

    let username = "";
    let gameUrl = "";

    for (const chunk of chunks) {
        if (!gameUrl && parseChessComGameSelectionFromInput(chunk)) {
            gameUrl = chunk;
            continue;
        }

        if (!username) {
            username = chunk;
        }
    }

    return { username, gameUrl };
}

function buildProductionChessComFieldInput(username: string, gameUrl: string) {
    const trimmedUsername = username.trim();
    const trimmedGameUrl = gameUrl.trim();

    if (trimmedUsername && trimmedGameUrl) {
        return `${trimmedUsername} | ${trimmedGameUrl}`;
    }

    return trimmedUsername || trimmedGameUrl;
}

function GameSelector({
    style,
    saveLocalStorage,
    syncUrlState,
    onGameSelect
}: GameSelectorProps) {
    const { t } = useTranslation("analysis");
    const [ searchParams, setSearchParams ] = useSearchParams();

    const {
        setSelectedGame,
        savedGameSource,
        setSavedGameSource,
        savedFieldInputs,
        setSavedFieldInput
    } = useGameSelector();

    const setBoardFlipped = useAnalysisBoardStore(
        state => state.setBoardFlipped
    );

    const [ gameSource, setGameSource ] = useState(
        saveLocalStorage ? savedGameSource : GameSource.PGN
    );
    const selectableGameSources = useMemo(
        () => getSelectableGameSources(),
        []
    );

    const [
        fieldInputs,
        setFieldInputs
    ] = useState(saveLocalStorage ? savedFieldInputs : {});

    const currentFieldInput = useMemo(() => (
        fieldInputs[gameSource.key] || ""
    ), [gameSource.key, fieldInputs]);
    const productionChessComFields = useMemo(
        () => parseProductionChessComFields(currentFieldInput),
        [currentFieldInput]
    );
    const showProductionChessComInlineInput = isProductionMode
        && gameSource.key == GameSource.CHESS_COM.key;

    const [
        serviceGames,
        setServiceGames
    ] = useState<Record<string, Game | null>>({
        [GameSource.CHESS_COM.key]: null,
        [GameSource.CHESS_COM_LIVE.key]: null,
        [GameSource.LICHESS.key]: null
    });

    const [ searchMenuOpen, setSearchMenuOpen ] = useState(false);

    const urlSelection = useMemo(() => syncUrlState
        ? getAnalysisSelectionFromUrl(searchParams)
        : undefined,
    [syncUrlState, searchParams]);
    const hasUrlSelection = syncUrlState
        && analysisSelectionUrlKeyList.some(key => searchParams.has(key));

    useEffect(() => {
        if (!syncUrlState) return;
        if (!hasUrlSelection) return;
        if (!urlSelection) return;

        const nextGameSource = getGameSource(urlSelection.sourceKey);

        setGameSource(nextGameSource);

        if (urlSelection.perspective) {
            setBoardFlipped(urlSelection.perspective == "black");
        }

        setFieldInputs(previousFieldInputs => {
            if (previousFieldInputs[nextGameSource.key] == urlSelection.input) {
                return previousFieldInputs;
            }

            return {
                ...previousFieldInputs,
                [nextGameSource.key]: urlSelection.input
            };
        });
    }, [
        syncUrlState,
        urlSelection?.sourceKey,
        urlSelection?.input,
        urlSelection?.perspective
    ]);

    function persistUrlSelection(
        sourceKey: GameSourceType,
        input: string,
        perspective: "white" | "black" | "auto" = "auto"
    ) {
        if (!syncUrlState) return;

        setSearchParams(updateAnalysisSelectionUrl(searchParams, {
            sourceKey,
            fieldInput: input,
            perspective
        }));
    }

    function getChessComSelectionInput(game: Game) {
        const chessComSource = game.source?.chessCom;

        if (chessComSource?.gameUrl) return chessComSource.gameUrl;

        if (chessComSource?.gameType && chessComSource.gameId) {
            return `https://www.chess.com/game/${chessComSource.gameType}/${chessComSource.gameId}`;
        }

        return currentFieldInput;
    }

    // Emit selected game when it updates
    useEffect(() => {
        if (
            gameSource.key == GameSource.CHESS_COM.key
            && isChessComGameUrl(currentFieldInput)
        ) {
            if (
                isProductionMode
                && parseProductionChessComFields(currentFieldInput).username.length == 0
            ) {
                return onGameSelect?.(null);
            }

            return onGameSelect?.(currentFieldInput);
        }

        if (gameSource.key == GameSource.CHESS_COM_LIVE.key) {
            return onGameSelect?.(currentFieldInput || null);
        }

        if (gameSource.selectorButton == GameSelectorButton.SEARCH_GAMES) {
            return onGameSelect?.(serviceGames[gameSource.key]);
        }

        onGameSelect?.(currentFieldInput || null);
    }, [currentFieldInput, serviceGames, gameSource, onGameSelect]);

    function updateFieldInput(value: string) {
        const updatedFieldInputs = {
            ...fieldInputs,
            [gameSource.key]: value
        };

        setSelectedGame(null);

        setFieldInputs(updatedFieldInputs);

        if (syncUrlState) {
            persistUrlSelection(gameSource.key, value);
        }

        if (!saveLocalStorage) return;
        setSavedFieldInput(gameSource.key, value);
    }

    function openGameSearchMenu() {
        if (currentFieldInput.length == 0) return;
        if (gameSource.key == GameSource.CHESS_COM.key && isChessComGameUrl(currentFieldInput)) return;
        if (gameSource.key == GameSource.CHESS_COM_LIVE.key) return;

        setSearchMenuOpen(true);
    }

    return <div className={styles.wrapper} style={style}>
        <div className={styles.gameSourceSection}>
            <div className={styles.gameSourceLabel}>
                {t("gameSelector.sourceLabel")}
            </div>

            <select
                className={styles.gameSourceSelector}
                onChange={event => {
                    const newGameSource = selectableGameSources.find(
                        source => source.key == event.target.value
                    ) || GameSource.PGN;

                    setGameSource(newGameSource);
                    setSelectedGame(null);

                    if (syncUrlState) {
                        persistUrlSelection(
                            newGameSource.key,
                            fieldInputs[newGameSource.key] || ""
                        );
                    }

                    if (!saveLocalStorage) return;
                    setSavedGameSource(newGameSource.key);
                }}
                value={gameSource.key}
            >
                {selectableGameSources
                    .map(source => <option key={source.key} value={source.key}>
                        {source.title}
                    </option>)
                }
            </select>
        </div>

        <textarea
            className={styles.selectorField}
            placeholder={t(
                "gameSelector.sourcePlaceholders."
                + sourcePlaceholderKeys[gameSource.key]
            )}
            style={{
                display: showProductionChessComInlineInput ? "none" : undefined,
                height: gameSource.expandField ? "170px" : "70px",
                borderRadius: gameSource.selectorButton != undefined
                    ? undefined : "0 0 10px 10px"
            }}
            value={currentFieldInput}
            onChange={event => updateFieldInput(event.target.value)}
            onKeyDown={event => {
                if (event.key != "Enter") return;
                if (
                    gameSource.selectorButton
                    != GameSelectorButton.SEARCH_GAMES
                ) return;

                event.preventDefault();
                openGameSearchMenu();
            }}
        />

        {showProductionChessComInlineInput && <div className={styles.productionChessComInputArea}>
            <div className={styles.productionChessComInputLabel}>
                Insert your username. 
                If providing a game URL, a username of one of the players is required.
            </div>

            <input
                className={styles.productionChessComInput}
                placeholder="Chess.com username"
                value={productionChessComFields.username}
                onChange={event => updateFieldInput(buildProductionChessComFieldInput(
                    event.target.value,
                    productionChessComFields.gameUrl
                ))}
                onKeyDown={event => {
                    if (event.key != "Enter") return;

                    event.preventDefault();
                }}
            />

            <input
                className={styles.productionChessComInput}
                placeholder="Chess.com game URL or ID"
                value={productionChessComFields.gameUrl}
                onChange={event => updateFieldInput(buildProductionChessComFieldInput(
                    productionChessComFields.username,
                    event.target.value
                ))}
                onKeyDown={event => {
                    if (event.key != "Enter") return;

                    event.preventDefault();
                }}
            />
        </div>}

        {gameSource.selectorButton == GameSelectorButton.SEARCH_GAMES
            && <Button
                className={styles.selectorButton}
                icon={iconInterfaceSearch}
                iconSize="25px"
                onClick={openGameSearchMenu}
            >
                {t("gameSelector.searchGamesButton")}
            </Button>
        }

        {gameSource.selectorButton == GameSelectorButton.UPLOAD_FILE
            && <FileUploader
                extensions={[".pgn"]}
                onFilesUpload={async files => {
                    const pgn = await files.item(0)?.text();
                    if (!pgn) return;

                    updateFieldInput(pgn);
                }}
            >
                <Button
                    className={styles.selectorButton}
                    icon={iconInterfaceUpload}
                    iconSize="25px"
                >
                    {t("gameSelector.uploadPGNButton")}
                </Button>
            </FileUploader>
        }
        
        {searchMenuOpen && <GameSearchMenu
            username={trim(currentFieldInput)}
            gameSource={gameSource}
            onClose={() => setSearchMenuOpen(false)}
            onGameSelect={game => {
                setServiceGames({
                    ...serviceGames,
                    [gameSource.key]: game
                });

                const usersColour = getColourPlayed(
                    game, trim(currentFieldInput)
                );

                setBoardFlipped(usersColour == PieceColour.BLACK);

                if (syncUrlState) {
                    persistUrlSelection(
                        gameSource.key,
                        (gameSource.key == GameSource.CHESS_COM.key || gameSource.key == GameSource.CHESS_COM_LIVE.key) && game
                            ? getChessComSelectionInput(game)
                            : currentFieldInput,
                        usersColour == PieceColour.BLACK ? "black" : "white"
                    );
                }
            }}
        />}
    </div>;
}

export default GameSelector;