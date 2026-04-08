import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import AnalysedGame from "shared/types/game/AnalysedGame";
import { getNodeChain } from "shared/types/game/position/StateTreeNode";
import useAnalysisGameStore from "../stores/AnalysisGameStore";
import useAnalysisBoardStore from "../stores/AnalysisBoardStore";
import useRealtimeEngineStore from "../stores/RealtimeEngineStore";
import { getArchivedGame } from "@/lib/gameArchive";
import { GameSource } from "@/components/chess/GameSelector/GameSource";
import {
    analysisSelectionUrlKeyList,
    getAnalysisSelectionFromUrl
} from "@analysis/lib/selectionUrl";
import parsePgn from "@/lib/games/pgn";
import parseFenString from "@/lib/games/fen";
import parseStateTree from "shared/lib/stateTree/parse";
import { getChessComGame } from "@/lib/games/chessCom";
import useEvaluateGame from "./useEvaluateGame";
import useAnalysisProgressStore from "../stores/AnalysisProgressStore";
import {
    getCachedLoadedGame,
    getLoadedGameCacheKey,
    setCachedLoadedGame
} from "@/lib/loadedGameCache";

function hasIncompleteAnalysis(game: AnalysedGame) {
    const mainlineNodes = getNodeChain(game.stateTree).slice(1);

    if (mainlineNodes.length == 0) {
        return false;
    }

    return mainlineNodes.some(node => (
        node.state.engineLines.length == 0
        || node.state.classification == undefined
        || node.state.accuracy == undefined
    ));
}

function useGameLoader() {
    const [ searchParams ] = useSearchParams();
    const archivedGameId = searchParams.get("game");
    const selectionSignature = analysisSelectionUrlKeyList
        .map(key => searchParams.get(key) || "")
        .join("|");
    const selection = getAnalysisSelectionFromUrl(searchParams);
    const selectionCacheKey = selection.input
        ? getLoadedGameCacheKey({
            sourceKey: selection.sourceKey,
            gameInput: selection.input
        })
        : undefined;
    const archivedCacheKey = archivedGameId
        ? getLoadedGameCacheKey({
            sourceKey: "archive",
            gameInput: archivedGameId
        })
        : undefined;

    const { setAnalysisGame, setGameAnalysisOpen } = useAnalysisGameStore(
        useShallow(state => ({
            setAnalysisGame: state.setAnalysisGame,
            setGameAnalysisOpen: state.setGameAnalysisOpen
        }))
    );

    const {
        analysisGame,
        gameAnalysisOpen
    } = useAnalysisGameStore(
        useShallow(state => ({
            analysisGame: state.analysisGame,
            gameAnalysisOpen: state.gameAnalysisOpen
        }))
    );

    const setCurrentStateTreeNode = useAnalysisBoardStore(
        state => state.setCurrentStateTreeNode
    );

    const {
        setBoardFlipped,
        setAutoplayEnabled
    } = useAnalysisBoardStore(
        useShallow(state => ({
            setBoardFlipped: state.setBoardFlipped,
            setAutoplayEnabled: state.setAutoplayEnabled
        }))
    );

    const setDisplayedEngineLines = useRealtimeEngineStore(
        state => state.setDisplayedEngineLines
    );

    const setEvaluationController = useAnalysisProgressStore(
        state => state.setEvaluationController
    );

    const evaluateGame = useEvaluateGame();

    function persistLoadedGame(cacheKey: string | undefined, game: AnalysedGame) {
        if (!cacheKey) return;

        setCachedLoadedGame(cacheKey, game);
    }

    async function applyLoadedGame(
        game: AnalysedGame,
        options?: {
            boardFlipped?: boolean;
            cacheKey?: string;
        }
    ) {
        if (options?.boardFlipped != undefined) {
            setBoardFlipped(options.boardFlipped);
        }

        setAutoplayEnabled(false);
        setGameAnalysisOpen(true);
        setAnalysisGame(game);
        setCurrentStateTreeNode(game.stateTree);
        setDisplayedEngineLines(game.stateTree.state.engineLines);
        persistLoadedGame(options?.cacheKey, game);

        if (!hasIncompleteAnalysis(game)) {
            return;
        }

        const controller = await evaluateGame(game);
        setEvaluationController(controller);
    }

    async function loadGame() {
        const gameId = searchParams.get("game");
        if (!gameId) return;

        const cachedGame = archivedCacheKey
            ? getCachedLoadedGame(archivedCacheKey)
            : undefined;
        if (cachedGame) {
            await applyLoadedGame(cachedGame, { cacheKey: archivedCacheKey });
            return;
        }

        const { game } = await getArchivedGame(gameId);
        if (!game) return;

        await applyLoadedGame(game, { cacheKey: archivedCacheKey });
    }

    async function loadSelectionGame() {
        if (searchParams.get("game")) return;
        if (!analysisSelectionUrlKeyList.some(key => searchParams.has(key))) return;

        if (!selection.input) return;

        const cachedGame = selectionCacheKey
            ? getCachedLoadedGame(selectionCacheKey)
            : undefined;
        if (cachedGame) {
            await applyLoadedGame(cachedGame, {
                cacheKey: selectionCacheKey,
                boardFlipped: selection.perspective == "white"
                    ? false
                    : (selection.perspective == "black"
                        ? true
                        : undefined)
            });
            return;
        }

        let importedGame;

        if (selection.sourceKey == GameSource.PGN.key) {
            importedGame = parsePgn(selection.input);
        } else if (selection.sourceKey == GameSource.FEN.key) {
            importedGame = parseFenString(selection.input);
        } else if (selection.sourceKey == GameSource.CHESS_COM.key) {
            const gameResponse = await getChessComGame(selection.input);

            if (gameResponse.status != 200 || !gameResponse.game) return;

            importedGame = gameResponse.game;
        }

        if (!importedGame) return;

        const analysisGame: AnalysedGame = {
            ...importedGame,
            stateTree: parseStateTree(importedGame)
        };

        await applyLoadedGame(analysisGame, {
            cacheKey: selectionCacheKey,
            boardFlipped: selection.perspective == "white"
                ? false
                : (selection.perspective == "black"
                    ? true
                    : undefined)
        });
    }

    useEffect(() => {
        if (!selectionCacheKey) return;
        if (!gameAnalysisOpen) return;
        if (!analysisGame?.stateTree) return;

        persistLoadedGame(selectionCacheKey, analysisGame);
    }, [selectionCacheKey, analysisGame, gameAnalysisOpen]);

    useEffect(() => {
        loadGame();
        loadSelectionGame();
    }, [archivedGameId, selectionSignature]);
}

export default useGameLoader;