import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import AnalysedGame from "shared/types/game/AnalysedGame";
import { getColourPlayed } from "shared/types/game/Game";
import PieceColour from "shared/constants/PieceColour";
import { GameSelectorButton, GameSource } from "@/components/chess/GameSelector/GameSource";
import useGameSelector, { SelectedGame } from "@/hooks/useGameSelector";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import parseStateTree from "shared/lib/stateTree/parse";
import {
    getChessComProfileDetails,
    isGameFromChessCom
} from "@/lib/profileImages";
import {
    getChessComGame,
    buildChessComGameUrl,
    parseChessComGameSelection,
    withChessComLookupUsername
} from "@/lib/games/chessCom";
import getChessComGames from "@/lib/games/chessCom";
import getLichessGames from "@/lib/games/lichess";
import parsePgn from "@/lib/games/pgn";
import parseFenString from "@/lib/games/fen";
import { updateAnalysisSelectionUrl } from "@analysis/lib/selectionUrl";

const messages = {
    fetchingLatest: "gameSelector.statusMessages.fetchingLatest",
    noGameSelected: "gameSelector.errors.noGameSelected",
    invalidGame: "gameSelector.errors.invalidGame"
};

function useImportGame() {
    const { t } = useTranslation("analysis");
    const [ searchParams, setSearchParams ] = useSearchParams();

    const {
        selectedGame,
        savedGameSource,
        savedCurrentFieldInput
    } = useGameSelector();

    const {
        setAnalysisGame,
        setGameAnalysisOpen
    } = useAnalysisGameStore();

    const {
        setCurrentStateTreeNode,
        setBoardFlipped,
        setAutoplayEnabled
    } = useAnalysisBoardStore();

    async function convertSelectedGame(selectedGame: SelectedGame) {
        if (typeof selectedGame == "string") {
            if (selectedGame.length == 0) return null;

            try {
                const parsedChessComSelection = parseChessComGameSelection(selectedGame);

                if (parsedChessComSelection) {
                    const callbackGame = await getChessComGame(selectedGame);

                    if (callbackGame.status != 200 || !callbackGame.game) {
                        throw new Error(t(messages.invalidGame));
                    }

                    return callbackGame.game;
                }

                if (savedGameSource.key == GameSource.PGN.key) {
                    return parsePgn(selectedGame);
                } else if (savedGameSource.key == GameSource.FEN.key) {
                    return parseFenString(selectedGame);
                } else if (
                    savedGameSource.key == GameSource.CHESS_COM.key
                    || savedGameSource.key == GameSource.CHESS_COM_LIVE.key
                ) {
                    return getChessComGame(selectedGame).then(response => {
                        if (response.status != 200 || !response.game) {
                            throw new Error(t(messages.invalidGame));
                        }

                        return response.game;
                    });
                }
            } catch {
                throw new Error(t(messages.invalidGame));
            }
        } else {
            return selectedGame;
        }

        return null;
    }

    async function importSelectedGame(
        onStatusMessage?: (message?: string) => void
    ) {
        const selectedGameWasString = typeof selectedGame == "string";
        let importedGame = await convertSelectedGame(selectedGame);

        if (
            !importedGame
            && (
                savedGameSource.key == GameSource.CHESS_COM.key
                || savedGameSource.key == GameSource.CHESS_COM_LIVE.key
            )
            && parseChessComGameSelection(savedCurrentFieldInput)
        ) {
            const callbackGame = await getChessComGame(savedCurrentFieldInput);

            if (callbackGame.status != 200 || !callbackGame.game) {
                throw new Error(t(messages.invalidGame));
            }

            importedGame = callbackGame.game;
        }

        if (!importedGame) {
            if (
                savedGameSource.selectorButton
                != GameSelectorButton.SEARCH_GAMES
            ) throw new Error(t(messages.noGameSelected));

            onStatusMessage?.(t(messages.fetchingLatest));

            const date = new Date();

            try {
                var gamesResponse = savedGameSource.key == GameSource.CHESS_COM.key
                    ? await getChessComGames(
                        savedCurrentFieldInput,
                        date.getMonth() + 1,
                        date.getFullYear()
                    )
                    : await getLichessGames(
                        savedCurrentFieldInput,
                        date.getMonth() + 1,
                        date.getFullYear()
                    );
            } catch (err) {
                throw new Error(t((err as Error).message));
            } finally {
                onStatusMessage?.();
            }

            const latestGame = gamesResponse.games?.at(0);

            if (!latestGame) throw new Error(t(messages.noGameSelected));

            importedGame = latestGame;
        }

        // Set analysis game to the selected one
        const analysisGame: AnalysedGame = {
            ...importedGame!,
            stateTree: parseStateTree(importedGame!)
        };

        if (selectedGameWasString) {
            if (
                savedGameSource.key == GameSource.CHESS_COM.key
                && !parseChessComGameSelection(selectedGame || "")
            ) {
                setBoardFlipped(
                    getColourPlayed(analysisGame, savedCurrentFieldInput)
                    == PieceColour.BLACK
                );
            }
        }
        setAutoplayEnabled(false);
        setAnalysisGame(analysisGame);
        setCurrentStateTreeNode(analysisGame.stateTree);
        setGameAnalysisOpen(true);

        const chessComSource = importedGame.source?.chessCom;
        const chessComGameUrl = chessComSource?.gameUrl
            || (chessComSource?.gameType && chessComSource?.gameId
                ? buildChessComGameUrl(
                    chessComSource.gameType as "live" | "daily" | "computer" | "master",
                    chessComSource.gameId
                )
                : undefined);
        const chessComSelectionInput = chessComGameUrl
            ? withChessComLookupUsername(
                chessComGameUrl,
                importedGame.players.white.username || importedGame.players.black.username
            )
            : undefined;

        const fieldInput = (
            savedGameSource.key == GameSource.CHESS_COM.key
            || savedGameSource.key == GameSource.CHESS_COM_LIVE.key
        )
            ? (chessComSelectionInput || (typeof selectedGame == "string" ? selectedGame : savedCurrentFieldInput))
            : (typeof selectedGame == "string" ? selectedGame : savedCurrentFieldInput);

        setSearchParams(updateAnalysisSelectionUrl(searchParams, {
            sourceKey: savedGameSource.key,
            fieldInput,
            perspective: "auto"
        }));

        // Load profile images from Chess.com if it is possible
        if (isGameFromChessCom(importedGame!)) {
            Promise.all([
                getChessComProfileDetails(analysisGame.players.white.username || ""),
                getChessComProfileDetails(analysisGame.players.black.username || "")
            ]).then(([ whiteProfile, blackProfile ]) => {
                analysisGame.players.white.image = whiteProfile.image;
                analysisGame.players.black.image = blackProfile.image;
                analysisGame.players.white.chessComStatus = whiteProfile.status;
                analysisGame.players.black.chessComStatus = blackProfile.status;
                analysisGame.players.white.chessComCountryCode = whiteProfile.countryCode;
                analysisGame.players.black.chessComCountryCode = blackProfile.countryCode;
                analysisGame.players.white.chessComCountryName = whiteProfile.countryName;
                analysisGame.players.black.chessComCountryName = blackProfile.countryName;

                setAnalysisGame(analysisGame);
            });
        }

        return analysisGame;
    }

    return importSelectedGame;
}

export default useImportGame;