import { useTranslation } from "react-i18next";

import AnalysedGame from "shared/types/game/AnalysedGame";
import { getColourPlayed } from "shared/types/game/Game";
import PieceColour from "shared/constants/PieceColour";
import { GameSelectorButton, GameSource } from "@/components/chess/GameSelector/GameSource";
import useGameSelector, { SelectedGame } from "@/hooks/useGameSelector";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import parseStateTree from "shared/lib/stateTree/parse";
import {
    getChessComProfileImages,
    isGameFromChessCom
} from "@/lib/profileImages";
import {
    getChessComGame,
    parseChessComGameSelection
} from "@/lib/games/chessCom";
import getChessComGames from "@/lib/games/chessCom";
import getLichessGames from "@/lib/games/lichess";
import parsePgn from "@/lib/games/pgn";
import parseFenString from "@/lib/games/fen";

const messages = {
    fetchingLatest: "gameSelector.statusMessages.fetchingLatest",
    noGameSelected: "gameSelector.errors.noGameSelected",
    invalidGame: "gameSelector.errors.invalidGame"
};

function useImportGame() {
    const { t } = useTranslation("analysis");

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
                } else if (savedGameSource.key == GameSource.CHESS_COM.key) {
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
            && savedGameSource.key == GameSource.CHESS_COM.key
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

        // Load profile images from Chess.com if it is possible
        if (isGameFromChessCom(importedGame!)) {
            getChessComProfileImages(importedGame!).then(images => {
                analysisGame.players.white.image = images.white;
                analysisGame.players.black.image = images.black;

                setAnalysisGame(analysisGame);
            });
        }

        return analysisGame;
    }

    return importSelectedGame;
}

export default useImportGame;