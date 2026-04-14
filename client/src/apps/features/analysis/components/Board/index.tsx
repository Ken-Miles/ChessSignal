import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Piece, Square } from "react-chessboard/dist/chessboard/types";
import { Chess, Move, PieceSymbol } from "chess.js";

import PieceColour from "shared/constants/PieceColour";
import { isMovePromotion } from "shared/lib/utils/chess";
import useResizeObserver from "@/hooks/useResizeObserver";
import PlayerProfile from "@/components/chess/PlayerProfile";
import EvaluationBar from "../EvaluationBar";

import { useSquares } from "./squares/useSquares";
import createSquareRenderer from "./squares/SquareRenderer";
import { SquaresContext } from "./squares/SquaresContext";

import BoardProps, { BoardArrow } from "./BoardProps";
import * as styles from "./Board.module.css";

type ClickMove = Pick<Move, "from" | "to">;
type PieceElementCache = Map<string, React.ReactElement>;
type BoardNode = NonNullable<BoardProps["node"]>;
type UserArrow = [Square, Square, string?];

const FALLBACK_BOARD_NODE: BoardNode = {
    state: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moveColour: PieceColour.WHITE,
        clock: undefined
    }
};

function getSquarePosition(square: string, flipped?: boolean) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;

    const displayFile = flipped ? 7 - file : file;
    const displayRank = flipped ? rank : 7 - rank;

    return {
        left: ((displayFile + 0.5) / 8) * 100,
        top: ((displayRank + 0.5) / 8) * 100
    };
}

const ARROW_HEAD_LENGTH = 2.1;
const ARROW_START_OFFSET = 5;

function shortenLineEnd(
    start: { left: number; top: number },
    end: { left: number; top: number },
    reducer = ARROW_HEAD_LENGTH
) {
    const deltaX = end.left - start.left;
    const deltaY = end.top - start.top;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance == 0) {
        return end;
    }

    const shortenBy = Math.min(reducer, distance);

    return {
        left: start.left + (deltaX * (distance - shortenBy)) / distance,
        top: start.top + (deltaY * (distance - shortenBy)) / distance
    };
}

function shiftPointTowards(
    start: { left: number; top: number },
    end: { left: number; top: number },
    amount = ARROW_START_OFFSET
) {
    const deltaX = end.left - start.left;
    const deltaY = end.top - start.top;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance == 0) {
        return start;
    }

    const shiftBy = Math.min(amount, distance);

    return {
        left: start.left + (deltaX * shiftBy) / distance,
        top: start.top + (deltaY * shiftBy) / distance
    };
}

function getElbowArrowPath(from: string, to: string, flipped?: boolean) {
    const start = getSquarePosition(from, flipped);
    const end = getSquarePosition(to, flipped);
    const deltaX = end.left - start.left;
    const deltaY = end.top - start.top;

    const bend = Math.abs(deltaX) > Math.abs(deltaY)
        ? { left: end.left, top: start.top }
        : { left: start.left, top: end.top };

    const arrowStart = shiftPointTowards(start, bend);

    const arrowEnd = shortenLineEnd(bend, end);

    return `M ${arrowStart.left} ${arrowStart.top} L ${bend.left} ${bend.top} L ${arrowEnd.left} ${arrowEnd.top}`;
}

function getStraightArrowPath(from: string, to: string, flipped?: boolean) {
    const start = getSquarePosition(from, flipped);
    const end = getSquarePosition(to, flipped);
    const arrowStart = shiftPointTowards(start, end);
    const arrowEnd = shortenLineEnd(start, end);

    return `M ${arrowStart.left} ${arrowStart.top} L ${arrowEnd.left} ${arrowEnd.top}`;
}

function isKnightArrow(from: string, to: string) {
    const fileDelta = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const rankDelta = Math.abs(Number(from[1]) - Number(to[1]));

    return (
        (fileDelta == 2 && rankDelta == 1)
        || (fileDelta == 1 && rankDelta == 2)
    );
}

/* TODO: do this in literally any better way */
const FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function getOutsideFiles(flipped?: boolean) {
    return flipped ? [...FILE_LABELS].reverse() : FILE_LABELS;
}

function getOutsideRanks(flipped?: boolean) {
    return flipped
        ? ["1", "2", "3", "4", "5", "6", "7", "8"]
        : ["8", "7", "6", "5", "4", "3", "2", "1"];
}

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
    node,
    flipped,
    evaluation,
    arrows,
    enableClassifications = true,
    onAddMove
}: BoardProps) {
    const squares = useSquares();
    const boardNode = node || FALLBACK_BOARD_NODE;

    const nodeRef = useRef(boardNode);

    useEffect(() => {
        nodeRef.current = boardNode;
    }, [boardNode]);

    const squareRenderer = useMemo(() => (
        createSquareRenderer(nodeRef, enableClassifications)
    ), [enableClassifications]);

    const [ heldPromotion, setHeldPromotion ] = useState<ClickMove>();
    const [ userArrows, setUserArrows ] = useState<UserArrow[]>([]);

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
    const computedBoardWidth = Math.max(
        320,
        boardWidth - (evaluation ? 36 : 0)
    );
    const showOutsideCoordinates = theme?.coordinatesPlacement == "outside";
    const showBoardNotation = theme?.coordinatesPlacement != "off"
        && !showOutsideCoordinates;
    const outsideFiles = getOutsideFiles(flipped);
    const outsideRanks = getOutsideRanks(flipped);

    const topProfile = flipped ? whiteProfile : blackProfile;
    const bottomProfile = flipped ? blackProfile : whiteProfile;
    const topProfileUrl = flipped ? whiteProfileUrl : blackProfileUrl;
    const bottomProfileUrl = flipped ? blackProfileUrl : whiteProfileUrl;
    const topProfileColour = flipped ? PieceColour.WHITE : PieceColour.BLACK;
    const bottomProfileColour = flipped ? PieceColour.BLACK : PieceColour.WHITE;
    const boardClock = boardNode.state.clock;
    const activeMoveColour = getActiveMoveColour(boardNode.state.fen);

    const [ straightArrows, knightArrows ] = useMemo(() => {
        const straight: BoardArrow[] = [];
        const knight: BoardArrow[] = [];

        for (const arrow of arrows || []) {
            if (arrow.isKnight) {
                knight.push(arrow);
            } else {
                straight.push(arrow);
            }
        }

        return [straight, knight];
    }, [arrows]);

    const [ userStraightArrows, userKnightArrows ] = useMemo(() => {
        const straight: BoardArrow[] = [];
        const knight: BoardArrow[] = [];

        for (const [from, to, color] of userArrows) {
            const userArrowColor = (
                !color
                || color == "rgba(0, 0, 0, 0)"
                || color == "transparent"
            ) ? "rgb(255,170,0)" : color;

            const userArrow: BoardArrow = {
                from,
                to,
                color: userArrowColor,
                isKnight: isKnightArrow(from, to)
            };

            if (userArrow.isKnight) {
                knight.push(userArrow);
            } else {
                straight.push(userArrow);
            }
        }

        return [straight, knight];
    }, [userArrows]);

    const straightArrowSignature = useMemo(() => (
        straightArrows
            .map(arrow => `${arrow.from}-${arrow.to}-${arrow.color}`)
            .join("|")
    ), [straightArrows]);

    const externalStraightArrows = useMemo(() => {
        if (!straightArrowSignature) {
            return [] as Array<[Square, Square, string?]>;
        }

        return straightArrows.map(arrow => [
            arrow.from as Square,
            arrow.to as Square,
            arrow.color
        ] as [Square, Square, string?]);
    }, [straightArrowSignature]);

    function onSquareClick(square: Square, piece?: Piece) {
        squares.setHighlighted([]);

        if (!piece || square == squares.selected) {
            squares.setSelected(undefined);
            squares.clearPlayable();
        } else {
            squares.setSelected(square);
            squares.loadPlayable(boardNode.state.fen, square);
        }

        if (!squares.selected) return;
        if (
            !squares.playable.includes(square)
            && !squares.capturable.includes(square)
        ) return;

        const selectedPiece = new Chess(boardNode.state.fen)
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
            const move = new Chess(boardNode.state.fen)
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
                currentFen={boardNode.state.fen}
                showClock={showPlayerClocks}
                clockTimeMs={getClockTimeMs(boardClock, topProfileColour)}
                clockActive={activeMoveColour == topProfileColour}
                clockRealtime={liveClockRealtime}
            />
        </div>}

        <div className={styles.boardContainer} ref={boardContainerRef}>
            {evaluation && <EvaluationBar
                evaluation={evaluation}
                moveColour={boardNode.state.moveColour}
                flipped={flipped}
            />}

            <SquaresContext.Provider value={squares}>
                <div className={styles.boardSurface}>
                    <Chessboard
                        position={boardNode.state.fen}
                        boardOrientation={flipped ? "black" : "white"}
                        onSquareClick={onSquareClick}
                        onSquareRightClick={squares.toggleHighlight}
                        onPieceDragBegin={(piece, square) => {
                            squares.setSelected(square);
                            squares.loadPlayable(boardNode.state.fen, square);
                        }}
                        onPieceDrop={(from, to, piece) => {
                            squares.setSelected(undefined);
                            squares.clearPlayable();

                            return addMove(from, to, getPieceType(piece), true);
                        }}
                        onPromotionPieceSelect={onPromotionPieceSelect}
                        customSquare={squareRenderer}
                        customArrows={externalStraightArrows}
                        onArrowsChange={setUserArrows}
                        customArrowColor="rgba(0, 0, 0, 0)"
                        customBoardStyle={customBoardStyle}
                        customLightSquareStyle={customLightSquareStyle}
                        customDarkSquareStyle={customDarkSquareStyle}
                        customNotationStyle={{
                            fontWeight: 700,
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)"
                        }}
                        arePiecesDraggable={piecesDraggable}
                        customPieces={customPieces}
                        boardWidth={computedBoardWidth}
                        animationDuration={165}
                        showBoardNotation={showBoardNotation}
                        showPromotionDialog={!!heldPromotion}
                        promotionToSquare={heldPromotion?.to}
                        promotionDialogVariant="vertical"
                    />

                    {userStraightArrows.length > 0 && <svg
                        className={styles.knightArrowOverlay}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <defs>
                            {userStraightArrows.map((arrow, index) => (
                                <marker
                                    key={`${arrow.from}-${arrow.to}-${index}`}
                                    id={`user-straight-arrow-head-${index}`}
                                    markerWidth="2.05"
                                    markerHeight="2.55"
                                    refX="1.35"
                                    refY="1.275"
                                    orient="auto"
                                    markerUnits="strokeWidth"
                                >
                                    <polygon points="0.2 0, 2.05 1.275, 0.2 2.55" fill={arrow.color} />
                                </marker>
                            ))}
                        </defs>

                        {userStraightArrows.map((arrow, index) => (
                            <path
                                key={`${arrow.from}-${arrow.to}-${index}`}
                                d={getStraightArrowPath(arrow.from, arrow.to, flipped)}
                                fill="none"
                                stroke={arrow.color}
                                opacity="0.8"
                                strokeWidth="2.35"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                strokeMiterlimit="2"
                                markerEnd={`url(#user-straight-arrow-head-${index})`}
                            />
                        ))}
                    </svg>}

                    {knightArrows.length > 0 && <svg
                        className={styles.knightArrowOverlay}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <defs>
                            {knightArrows.map((arrow, index) => (
                                <marker
                                    key={`${arrow.from}-${arrow.to}-${index}`}
                                    id={`knight-arrow-head-${index}`}
                                    markerWidth="2.15"
                                    markerHeight="2.65"
                                    refX="1.42"
                                    refY="1.325"
                                    orient="auto"
                                    markerUnits="strokeWidth"
                                >
                                    <polygon points="0.2 0, 2.15 1.325, 0.2 2.65" fill={arrow.color} />
                                </marker>
                            ))}
                        </defs>

                        {knightArrows.map((arrow, index) => (
                            <path
                                key={`${arrow.from}-${arrow.to}-${index}`}
                                d={getElbowArrowPath(arrow.from, arrow.to, flipped)}
                                fill="none"
                                stroke={arrow.color}
                                opacity="0.8"
                                strokeWidth="2.35"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                strokeMiterlimit="2"
                                markerEnd={`url(#knight-arrow-head-${index})`}
                            />
                        ))}
                    </svg>}

                    {userKnightArrows.length > 0 && <svg
                        className={styles.knightArrowOverlay}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <defs>
                            {userKnightArrows.map((arrow, index) => (
                                <marker
                                    key={`${arrow.from}-${arrow.to}-${index}`}
                                    id={`user-knight-arrow-head-${index}`}
                                    markerWidth="2.15"
                                    markerHeight="2.65"
                                    refX="1.42"
                                    refY="1.325"
                                    orient="auto"
                                    markerUnits="strokeWidth"
                                >
                                    <polygon points="0.2 0, 2.15 1.325, 0.2 2.65" fill={arrow.color} />
                                </marker>
                            ))}
                        </defs>

                        {userKnightArrows.map((arrow, index) => (
                            <path
                                key={`${arrow.from}-${arrow.to}-${index}`}
                                d={getElbowArrowPath(arrow.from, arrow.to, flipped)}
                                fill="none"
                                stroke={arrow.color}
                                opacity="0.8"
                                strokeWidth="2.35"
                                strokeLinecap="butt"
                                strokeLinejoin="miter"
                                strokeMiterlimit="2"
                                markerEnd={`url(#user-knight-arrow-head-${index})`}
                            />
                        ))}
                    </svg>}

                    {showOutsideCoordinates && <>
                        <div className={styles.rankCoordinates}>
                            {outsideRanks.map((rank, index) => <span
                                key={rank}
                                className={styles.outsideCoordinate}
                                style={{
                                    top: `${((index + 0.5) / 8) * 100}%`
                                }}
                            >
                                {rank}
                            </span>)}
                        </div>

                        <div className={styles.fileCoordinates}>
                            {outsideFiles.map((file, index) => <span
                                key={file}
                                className={styles.outsideCoordinate}
                                style={{
                                    left: `${((index + 0.5) / 8) * 100}%`
                                }}
                            >
                                {file}
                            </span>)}
                        </div>
                    </>}
                </div>
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
                currentFen={boardNode.state.fen}
                showClock={showPlayerClocks}
                clockTimeMs={getClockTimeMs(boardClock, bottomProfileColour)}
                clockActive={activeMoveColour == bottomProfileColour}
                clockRealtime={liveClockRealtime}
            />
        </div>}
    </div>;
}

export default Board;