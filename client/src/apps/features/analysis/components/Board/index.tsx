import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Piece, Square } from "react-chessboard/dist/chessboard/types";
import { Chess, Move, PieceSymbol } from "chess.js";

import { defaultRootNode } from "shared/constants/utils";
import { isMovePromotion } from "shared/lib/utils/chess";
import PieceColour from "shared/constants/PieceColour";
import useResizeObserver from "@/hooks/useResizeObserver";
import PlayerProfile from "@/components/chess/PlayerProfile";
import EvaluationBar from "../EvaluationBar";

import { useSquares } from "./squares/useSquares";
import createSquareRenderer from "./squares/SquareRenderer";
import { SquaresContext } from "./squares/SquaresContext";

import BoardProps from "./BoardProps";
import * as styles from "./Board.module.css";

type ClickMove = Pick<Move, "from" | "to">;
type PieceElementCache = Map<string, React.ReactElement>;

interface PieceImageProps {
    src: string;
    squareWidth: number;
}

const PieceImage = React.memo(function PieceImage({
    src,
    squareWidth
}: PieceImageProps) {
    return <img
        src={src}
        width={squareWidth}
        height={squareWidth}
        draggable={false}
        alt=""
    />;
}, (prev, next) => (
    prev.src == next.src
    && prev.squareWidth == next.squareWidth
));

function getPieceType(piece: Piece) {
    return piece.at(1)?.toLowerCase() as PieceSymbol;
}

function getClockTimeMs(
    clock: { whiteMs?: number; blackMs?: number } | undefined,
    playerColour: PieceColour
) {
    if (!clock) return undefined;

    return playerColour == PieceColour.WHITE ? clock.whiteMs : clock.blackMs;
}

function getActiveMoveColour(fen: string) {
    const turnToken = fen.split(" ")[1];

    return turnToken == "b"
        ? PieceColour.BLACK
        : PieceColour.WHITE;
}

function Board({
    className,
    style,
    profileClassName,
    profileStyle,
    showPlayerClocks = true,
    liveClockRealtime = false,
    whiteProfile,
    blackProfile,
    whiteProfileUrl,
    blackProfileUrl,
    theme,
    piecesDraggable = true,
    node = defaultRootNode,
    flipped,
    evaluation,
    arrows,
    enableClassifications = true,
    onAddMove
}: BoardProps) {
    const squares = useSquares();

    const nodeRef = useRef(node);

    useEffect(() => {
        nodeRef.current = node;
    }, [node]);

    const squareRenderer = useMemo(() => (
        createSquareRenderer(nodeRef, enableClassifications)
    ), [enableClassifications]);

    const [ heldPromotion, setHeldPromotion ] = useState<ClickMove>();

    const customPieces = useMemo(() => {
        if (!theme?.pieceSet && !theme?.preset) {
            return undefined;
        }

        const basePath = theme?.preset
            ? `/img/chessboards/presets/${theme.preset}`
            : `/img/pieces/chessglyphs/${theme?.pieceSet}`;

        const pieceElementCache: PieceElementCache = new Map();

        const renderPiece = (colour: "w" | "b", piece: string) => {
            const src = `${basePath}/${colour}${piece}.png`;

            return (props: { squareWidth: number }) => {
                const cacheKey = `${src}:${props.squareWidth}`;
                const cachedElement = pieceElementCache.get(cacheKey);

                if (cachedElement) {
                    return cachedElement;
                }

                const element = <PieceImage
                    src={src}
                    squareWidth={props.squareWidth}
                />;

                pieceElementCache.set(cacheKey, element);

                return element;
            };
        };

        return {
            wP: renderPiece("w", "p"),
            wR: renderPiece("w", "r"),
            wN: renderPiece("w", "n"),
            wB: renderPiece("w", "b"),
            wQ: renderPiece("w", "q"),
            wK: renderPiece("w", "k"),
            bP: renderPiece("b", "p"),
            bR: renderPiece("b", "r"),
            bN: renderPiece("b", "n"),
            bB: renderPiece("b", "b"),
            bQ: renderPiece("b", "q"),
            bK: renderPiece("b", "k")
        };
    }, [theme?.pieceSet, theme?.preset]);

    const boardTexturePath = useMemo(() => {
        if (theme?.preset) {
            return `/img/chessboards/presets/${theme.preset}/board.png`;
        }

        if (theme?.boardTexture) {
            return `/img/chessboards/boards/${theme.boardTexture}.png`;
        }

        return undefined;
    }, [theme?.preset, theme?.boardTexture]);

    const customLightSquareStyle = useMemo(() => {
        if (boardTexturePath) {
            return {
                backgroundColor: "transparent"
            };
        }

        return {
            backgroundColor: theme?.lightSquareColour || "#f0d9b5"
        };
    }, [boardTexturePath, theme?.lightSquareColour]);

    const customDarkSquareStyle = useMemo(() => {
        if (boardTexturePath) {
            return {
                backgroundColor: "transparent"
            };
        }

        return {
            backgroundColor: theme?.darkSquareColour || "#b58863"
        };
    }, [boardTexturePath, theme?.darkSquareColour]);

    const customBoardStyle = useMemo(() => {
        if (!boardTexturePath) {
            return undefined;
        }

        return {
            backgroundImage: `url('${boardTexturePath}')`,
            backgroundSize: "cover",
            backgroundPosition: "center"
        };
    }, [boardTexturePath]);

    const boardContainerRef = useRef<HTMLDivElement | null>(null);
    const { fullWidth: boardWidth } = useResizeObserver(boardContainerRef, 1);

    const topProfile = flipped ? whiteProfile : blackProfile;
    const bottomProfile = flipped ? blackProfile : whiteProfile;
    const topProfileUrl = flipped ? whiteProfileUrl : blackProfileUrl;
    const bottomProfileUrl = flipped ? blackProfileUrl : whiteProfileUrl;
    const topProfileColour = flipped ? PieceColour.WHITE : PieceColour.BLACK;
    const bottomProfileColour = flipped ? PieceColour.BLACK : PieceColour.WHITE;
    const boardClock = node.state.clock;
    const activeMoveColour = getActiveMoveColour(node.state.fen);

    function onSquareClick(square: Square, piece?: Piece) {
        squares.setHighlighted([]);

        if (!piece || square == squares.selected) {
            squares.setSelected(undefined);
            squares.clearPlayable();
        } else {
            squares.setSelected(square);
            squares.loadPlayable(node.state.fen, square);
        }

        if (!squares.selected) return;
        if (
            !squares.playable.includes(square)
            && !squares.capturable.includes(square)
        ) return;

        const selectedPiece = new Chess(node.state.fen)
            .get(squares.selected);

        if (selectedPiece && isMovePromotion(selectedPiece.type, square)) {
            setHeldPromotion({
                from: squares.selected,
                to: square
            });
        }

        addMove(squares.selected, square);
    }

    function onPromotionPieceSelect(
        piece?: Piece, from?: Square, to?: Square
    ) {
        if (!piece || !to) return false;

        setHeldPromotion(undefined);

        const fromSquare = heldPromotion?.from || from;
        if (!fromSquare) return false;
        
        return addMove(fromSquare, to, getPieceType(piece));
    }

    function addMove(
        from: Square, to: Square, promotion?: PieceSymbol,
        drop?: boolean
    ) {
        try {
            const move = new Chess(node.state.fen)
                .move({ from, to, promotion });

            squares.setPieceDropFlag(drop || false);

            return onAddMove?.(move) || true;
        } catch {
            return false;
        }
    }

    return <div
        className={`${styles.wrapper} ${className}`}
        style={style}
    >
        {topProfile && <div
            className={`${styles.profile} ${profileClassName}`}
            style={{ borderRadius: "7px 7px 0 0", ...profileStyle }}
        >
            <PlayerProfile
                profile={topProfile}
                profileUrl={topProfileUrl}
                playerColour={topProfileColour}
                currentFen={node.state.fen}
                showClock={showPlayerClocks}
                clockTimeMs={getClockTimeMs(boardClock, topProfileColour)}
                clockActive={activeMoveColour == topProfileColour}
                clockRealtime={liveClockRealtime}
            />
        </div>}

        <div className={styles.boardContainer} ref={boardContainerRef}>
            {evaluation && <EvaluationBar
                evaluation={evaluation}
                moveColour={node.state.moveColour}
                flipped={flipped}
            />}

            <SquaresContext.Provider value={squares}>
                <Chessboard
                    position={node.state.fen}
                    boardOrientation={flipped ? "black" : "white"}
                    onSquareClick={onSquareClick}
                    onSquareRightClick={squares.toggleHighlight}
                    onPieceDragBegin={(piece, square) => {
                        squares.setSelected(square);
                        squares.loadPlayable(node.state.fen, square);
                    }}
                    onPieceDrop={(from, to, piece) => {
                        squares.setSelected(undefined);
                        squares.clearPlayable();

                        return addMove(from, to, getPieceType(piece), true);
                    }}
                    onPromotionPieceSelect={onPromotionPieceSelect}
                    customSquare={squareRenderer}
                    customArrows={arrows}
                    customBoardStyle={customBoardStyle}
                    customLightSquareStyle={customLightSquareStyle}
                    customDarkSquareStyle={customDarkSquareStyle}
                    arePiecesDraggable={piecesDraggable}
                    customPieces={customPieces}
                    boardWidth={Math.max(
                        320,
                        boardWidth - (evaluation ? 22 : 0)
                    )}
                    animationDuration={165}
                    showPromotionDialog={!!heldPromotion}
                    promotionToSquare={heldPromotion?.to}
                    promotionDialogVariant="vertical"
                />
            </SquaresContext.Provider>
        </div>

        {bottomProfile && <div
            className={`${styles.profile} ${profileClassName}`}
            style={{ borderRadius: "0 0 7px 7px", ...profileStyle }}
        >
            <PlayerProfile
                profile={bottomProfile}
                profileUrl={bottomProfileUrl}
                playerColour={bottomProfileColour}
                currentFen={node.state.fen}
                showClock={showPlayerClocks}
                clockTimeMs={getClockTimeMs(boardClock, bottomProfileColour)}
                clockActive={activeMoveColour == bottomProfileColour}
                clockRealtime={liveClockRealtime}
            />
        </div>}
    </div>;
}

export default Board;