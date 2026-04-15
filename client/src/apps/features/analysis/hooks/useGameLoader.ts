import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

import AnalysedGame from "shared/types/game/AnalysedGame";
import { EngineLine } from "shared/types/game/position/EngineLine";
import { Move } from "shared/types/game/position/Move";
import { StateTreeNode } from "shared/types/game/position/StateTreeNode";
import useAnalysisGameStore from "../stores/AnalysisGameStore";
import useAnalysisBoardStore from "../stores/AnalysisBoardStore";
import useRealtimeEngineStore from "../stores/RealtimeEngineStore";
import { getArchivedGame } from "@/lib/gameArchive";
import { GameSource } from "@/components/chess/GameSelector/GameSource";
import useSettingsStore from "@/stores/SettingsStore";
import {
    getAnalysisArchiveGameIdFromUrl,
    getAnalysisMovePlyFromUrl,
    analysisSelectionUrlKeyList,
    getAnalysisSelectionFromUrl
} from "@analysis/lib/selectionUrl";
import parsePgn from "@/lib/games/pgn";
import parseFenString from "@/lib/games/fen";
import parseStateTree from "shared/lib/stateTree/parse";
import {
    getChessComGame,
    isChessComProxyUnavailableStatus,
    pollChessComLiveGame
} from "@/lib/games/chessCom";
import useEvaluateGame from "./useEvaluateGame";
import useAnalysisProgressStore from "../stores/AnalysisProgressStore";
import {
    getCachedLoadedGame,
    getLoadedGameCacheKey,
    setCachedLoadedGame
} from "@/lib/loadedGameCache";

function hasIncompleteAnalysis(
    game: AnalysedGame
) {
    const mainlineNodes: Array<{
        state: {
            engineLines: EngineLine[];
            classification?: unknown;
            accuracy?: unknown;
        };
    }> = [];

    let current: StateTreeNode | undefined = game.stateTree;

    while (current) {
        if (current != game.stateTree) {
            mainlineNodes.push(current as unknown as {
                state: {
                    engineLines: EngineLine[];
                    classification?: unknown;
                    accuracy?: unknown;
                };
            });
        }

        current = current.children[0] as StateTreeNode | undefined;
    }

    if (mainlineNodes.length == 0) {
        return false;
    }

    return mainlineNodes.some(node => (
        node.state.engineLines.length == 0
        || node.state.classification == undefined
        || node.state.accuracy == undefined
    ));
}

function copyMainlineAnalysisFields(
    previousStateTree: StateTreeNode,
    nextStateTree: StateTreeNode
) {
    const cloneEngineLines = (node: StateTreeNode) => (
        node.state.engineLines.map((line: EngineLine) => ({
            ...line,
            moves: line.moves.map((move: Move) => ({
                ...move,
                clock: move.clock
                    ? { ...move.clock }
                    : undefined
            }))
        }))
    );

    let previousNode: StateTreeNode | undefined = previousStateTree;
    let nextNode: StateTreeNode | undefined = nextStateTree;

    while (previousNode && nextNode) {
        if (previousNode.state.fen != nextNode.state.fen) {
            break;
        }

        const copiedEngineLines = cloneEngineLines(previousNode);

        if (
            nextNode.state.engineLines.length == 0
            && copiedEngineLines.length > 0
        ) {
            nextNode.state.engineLines = copiedEngineLines;
        }

        if (nextNode.state.classification == undefined) {
            nextNode.state.classification = previousNode.state.classification;
        }

        if (nextNode.state.accuracy == undefined) {
            nextNode.state.accuracy = previousNode.state.accuracy;
        }

        if (nextNode.state.opening == undefined) {
            nextNode.state.opening = previousNode.state.opening;
        }

        const previousMainline = previousNode.children[0] as StateTreeNode | undefined;
        const nextMainline = nextNode.children[0] as StateTreeNode | undefined;

        if (!previousMainline || !nextMainline) {
            break;
        }

        if (previousMainline.state.move?.uci != nextMainline.state.move?.uci) {
            break;
        }

        previousNode = previousMainline;
        nextNode = nextMainline;
    }
}

function findFinalMainlineNode(root: StateTreeNode) {
    let current: StateTreeNode = root;

    while (current.children[0]) {
        current = current.children[0] as StateTreeNode;
    }

    return current;
}

function findMainlineNodeAtPly(root: StateTreeNode, ply: number) {
    let current: StateTreeNode = root;
    let remainingPly = Math.max(0, Math.trunc(ply));

    while (remainingPly > 0) {
        const nextNode = current.children.find(child => child.mainline)
            || current.children[0] as StateTreeNode | undefined;

        if (!nextNode) {
            break;
        }

        current = nextNode;
        remainingPly--;
    }

    return current;
}

function useGameLoader() {
    const engineVersion = useSettingsStore(
        state => state.settings.analysis.engine.version
    );

    const [ searchParams, setSearchParams ] = useSearchParams();
    const archivedGameId = getAnalysisArchiveGameIdFromUrl(searchParams);
    const initialMovePly = getAnalysisMovePlyFromUrl(searchParams);
    const selectionSignature = analysisSelectionUrlKeyList
        .map(key => searchParams.get(key) || "")
        .join("|");
    const selection = getAnalysisSelectionFromUrl(searchParams);
    const selectionCacheKey = selection.input
        ? getLoadedGameCacheKey({
            sourceKey: selection.sourceKey,
            gameInput: selection.input,
            engineVersion
        })
        : undefined;
    const archivedCacheKey = archivedGameId
        ? getLoadedGameCacheKey({
            sourceKey: "archive",
            gameInput: archivedGameId,
            engineVersion
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

    const { setEvaluationController } = useAnalysisProgressStore(
        useShallow(state => ({
            setEvaluationController: state.setEvaluationController
        }))
    );

    const evaluateGame = useEvaluateGame();
    const latestAnalysisGameRef = useRef(analysisGame);
    const loadedEngineVersionRef = useRef(engineVersion);

    useEffect(() => {
        latestAnalysisGameRef.current = analysisGame;
    }, [analysisGame]);

    function persistLoadedGame(cacheKey: string | undefined, game: AnalysedGame) {
        if (!cacheKey) return;
        if (loadedEngineVersionRef.current != engineVersion) return;

        setCachedLoadedGame(cacheKey, game);
    }

    async function applyLoadedGame(
        game: AnalysedGame,
        options?: {
            boardFlipped?: boolean;
            cacheKey?: string;
            skipEvaluation?: boolean;
            jumpToEnd?: boolean;
            initialMovePly?: number;
        }
    ) {
        if (options?.boardFlipped != undefined) {
            setBoardFlipped(options.boardFlipped);
        }

        loadedEngineVersionRef.current = engineVersion;

        setAutoplayEnabled(false);
        setGameAnalysisOpen(true);
        setAnalysisGame(game);
        setCurrentStateTreeNode(options?.initialMovePly != undefined
            ? findMainlineNodeAtPly(game.stateTree, options.initialMovePly)
            : (options?.jumpToEnd
                ? (findFinalMainlineNode(game.stateTree) || game.stateTree)
                : game.stateTree));
        setDisplayedEngineLines(game.stateTree.state.engineLines);
        persistLoadedGame(options?.cacheKey, game);

        if (options?.skipEvaluation) {
            return;
        }

        if (!hasIncompleteAnalysis(game)) {
            return;
        }

        const controller = await evaluateGame(game);
        setEvaluationController(controller);
    }

    async function loadGame() {
        const gameId = getAnalysisArchiveGameIdFromUrl(searchParams);
        if (!gameId) return;

        const cachedGame = archivedCacheKey
            ? getCachedLoadedGame(archivedCacheKey)
            : undefined;
        if (cachedGame) {
            await applyLoadedGame(cachedGame, {
                cacheKey: archivedCacheKey,
                initialMovePly
            });
            return;
        }

        const { game } = await getArchivedGame(gameId);
        if (!game) return;

        await applyLoadedGame(game, {
            cacheKey: archivedCacheKey,
            initialMovePly
        });
    }

    async function loadSelectionGame() {
        if (getAnalysisArchiveGameIdFromUrl(searchParams)) return;
        if (!analysisSelectionUrlKeyList.some(key => searchParams.has(key))) return;

        if (!selection.input) return;

        const shouldUseSelectionCache = selection.sourceKey != GameSource.CHESS_COM_LIVE.key;

        const cachedGame = shouldUseSelectionCache && selectionCacheKey
            ? getCachedLoadedGame(selectionCacheKey)
            : undefined;
        if (cachedGame) {
            await applyLoadedGame(cachedGame, {
                cacheKey: selectionCacheKey,
                initialMovePly,
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
        } else if (
            selection.sourceKey == GameSource.CHESS_COM.key
            || selection.sourceKey == GameSource.CHESS_COM_LIVE.key
        ) {
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
            cacheKey: shouldUseSelectionCache ? selectionCacheKey : undefined,
            initialMovePly,
            boardFlipped: selection.perspective == "white"
                ? false
                : (selection.perspective == "black"
                    ? true
                    : undefined),
            jumpToEnd: importedGame.source?.chessCom?.isLiveOngoing == true,
            // On initial load (including live reload mid-game), evaluate in background.
            // Live poll updates remain incremental-only and skip full evaluation.
            skipEvaluation: false
        });
    }

    useEffect(() => {
        if (!selectionCacheKey) return;
        if (!gameAnalysisOpen) return;
        if (!analysisGame?.stateTree) return;
        if (selection.sourceKey == GameSource.CHESS_COM_LIVE.key) return;
        if (
            analysisGame.source?.chessCom?.isLiveOngoing
            && selection.sourceKey == GameSource.CHESS_COM.key
        ) return;

        persistLoadedGame(selectionCacheKey, analysisGame);
    }, [selectionCacheKey, analysisGame, gameAnalysisOpen, selection.sourceKey, engineVersion]);

    useEffect(() => {
        loadGame();
        loadSelectionGame();
    }, [archivedGameId, selectionSignature, engineVersion]);

    useEffect(() => {
        const liveMetadata = analysisGame?.source?.chessCom;
        const livePollingGameId = liveMetadata?.liveGameId || liveMetadata?.gameId;

        if (!gameAnalysisOpen) return;
        if (!analysisGame) return;
        if (getAnalysisArchiveGameIdFromUrl(searchParams)) return;
        if (!liveMetadata?.isLiveOngoing) return;
        if (!livePollingGameId) return;

        const resolveBoardFlipped = () => (
            selection.perspective == "white"
                ? false
                : (selection.perspective == "black"
                    ? true
                    : undefined)
        );

        let cancelled = false;
        let pollingStopped = false;
        let intervalId: ReturnType<typeof window.setInterval> | undefined;

        const stopPolling = () => {
            if (pollingStopped) {
                return;
            }

            pollingStopped = true;
            cancelled = true;

            if (intervalId != undefined) {
                window.clearInterval(intervalId);
            }
        };

        const pollLiveGame = async () => {
            if (pollingStopped) {
                return;
            }

            const latestAnalysisGame = latestAnalysisGameRef.current;

            const liveGameResponse = await pollChessComLiveGame(livePollingGameId);

            if (cancelled) return;

            if (isChessComProxyUnavailableStatus(liveGameResponse.status)) {
                stopPolling();
                return;
            }

            if (liveGameResponse.status != 200 || !liveGameResponse.game) {
                if (![404, 410].includes(liveGameResponse.status || 0)) {
                    return;
                }

                stopPolling();
                return;
            }

            const isFinishedLiveGame = liveGameResponse.liveStatus == "finished";

            if (liveGameResponse.game.pgn == latestAnalysisGame.pgn) {
                const polledClock = liveGameResponse.game.source?.chessCom?.liveCurrentClocksMs;

                if (polledClock) {
                    setCurrentStateTreeNode((prev: StateTreeNode) => ({
                        ...prev,
                        state: {
                            ...prev.state,
                            clock: {
                                whiteMs: polledClock.whiteMs,
                                blackMs: polledClock.blackMs
                            }
                        }
                    }));
                }

                if (isFinishedLiveGame) {
                    setAnalysisGame({
                        ...latestAnalysisGame,
                        ...liveGameResponse.game,
                        source: {
                            ...latestAnalysisGame.source,
                            chessCom: {
                                ...latestAnalysisGame.source?.chessCom,
                                ...liveGameResponse.game.source?.chessCom,
                                gameUrl: liveGameResponse.canonicalGameUrl
                                    || liveMetadata.gameUrl
                                    || liveGameResponse.game.source?.chessCom?.gameUrl,
                                isLiveOngoing: false
                            }
                        },
                        stateTree: latestAnalysisGame.stateTree
                    });

                    stopPolling();
                }

                return;
            }

            const refreshedStateTree = parseStateTree(liveGameResponse.game);
            copyMainlineAnalysisFields(
                latestAnalysisGame.stateTree,
                refreshedStateTree
            );

            await applyLoadedGame({
                ...liveGameResponse.game,
                stateTree: refreshedStateTree
            }, {
                boardFlipped: resolveBoardFlipped(),
                cacheKey: selectionCacheKey,
                jumpToEnd: true,
                skipEvaluation: false
            });

            if (isFinishedLiveGame) {
                stopPolling();
            }
        };

        intervalId = window.setInterval(() => {
            void pollLiveGame();
        }, 2000);

        void pollLiveGame();

        return () => {
            stopPolling();
        };
    }, [
        analysisGame?.pgn,
        analysisGame?.source?.chessCom?.gameUrl,
        analysisGame?.source?.chessCom?.isLiveOngoing,
        analysisGame?.source?.chessCom?.legacyGameId,
        analysisGame?.source?.chessCom?.liveGameId,
        analysisGame?.source?.chessCom?.gameId,
        gameAnalysisOpen,
        searchParams,
        selection.sourceKey,
        selection.perspective,
        selectionCacheKey,
        setSearchParams
    ]);
}

export default useGameLoader;