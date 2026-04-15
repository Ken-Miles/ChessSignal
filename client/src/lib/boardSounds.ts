import { Chess } from "chess.js";

import { StateTreeNode } from "shared/types/game/position/StateTreeNode";
import { parseSanMove } from "shared/lib/utils/chess";

import iconMove from "@assets/audio/move.mp3";
import iconCheck from "@assets/audio/check.mp3";
import iconCapture from "@assets/audio/capture.mp3";
import iconCastle from "@assets/audio/castle.mp3";
import iconPromote from "@assets/audio/promote.mp3";
import iconGameend from "@assets/audio/gameend.mp3";

const moveSounds = {
    move: iconMove,
    check: iconCheck,
    capture: iconCapture,
    castle: iconCastle,
    promote: iconPromote,
    gameEnd: iconGameend
};

type MoveSoundKey = keyof typeof moveSounds;

const cachedMoveSounds: Partial<Record<MoveSoundKey, HTMLAudioElement>> = {};
let queuedSoundAfterUnlock: MoveSoundKey | undefined;
let audioUnlockListenerAttached = false;

function isBrowserRuntime() {
    return typeof window != "undefined" && typeof Audio != "undefined";
}

function getCachedMoveSound(sound: MoveSoundKey) {
    if (!isBrowserRuntime()) {
        return;
    }

    const existingAudio = cachedMoveSounds[sound];
    if (existingAudio) {
        return existingAudio;
    }

    const createdAudio = new Audio(moveSounds[sound]);

    createdAudio.preload = "auto";
    createdAudio.volume = 1;

    cachedMoveSounds[sound] = createdAudio;

    return createdAudio;
}

function tryPlaySound(sound: MoveSoundKey) {
    const audio = getCachedMoveSound(sound);
    if (!audio) return;

    audio.currentTime = 0;

    const playback = audio.play();

    if (!playback || typeof playback.catch != "function") {
        return;
    }

    playback.catch(() => {
        queuedSoundAfterUnlock = sound;
        attachAudioUnlockListener();
    });
}

function attachAudioUnlockListener() {
    if (!isBrowserRuntime()) return;
    if (audioUnlockListenerAttached) return;

    const unlockAudio = () => {
        if (queuedSoundAfterUnlock) {
            const queuedSound = queuedSoundAfterUnlock;
            queuedSoundAfterUnlock = undefined;
            tryPlaySound(queuedSound);
        }

        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);

        audioUnlockListenerAttached = false;
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    audioUnlockListenerAttached = true;
}

function playBoardSound(node: StateTreeNode) {
    const move = node.state.move;
    if (!move) return;

    const board = new Chess(node.state.fen);

    if (board.isGameOver()) {
        tryPlaySound("gameEnd");
    }

    const parsedMove = parseSanMove(move.san);

    if (parsedMove.check || parsedMove.checkmate) {
        tryPlaySound("check");
    } else if (parsedMove.castling) {
        tryPlaySound("castle");
    } else if (parsedMove.promotion) {
        tryPlaySound("promote");
    } else if (parsedMove.capture) {
        tryPlaySound("capture");
    } else {
        tryPlaySound("move");
    }
}

export default playBoardSound;