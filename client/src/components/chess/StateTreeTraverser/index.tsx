import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Options as HotkeyOptions, useHotkeys } from "react-hotkeys-hook";

import { getNodeChain } from "shared/types/game/position/StateTreeNode";
import useAnalysisGameStore from "@analysis/stores/AnalysisGameStore";
import useAnalysisBoardStore from "@analysis/stores/AnalysisBoardStore";
import playBoardSound from "@/lib/boardSounds";

import StateTreeTraverserProps from "./StateTreeTraverserProps";
import * as styles from "./StateTreeTraverser.module.css";

import iconInterfaceStart from "@assets/img/interface/start.svg";
import iconInterfaceBack from "@assets/img/interface/back.svg";
import iconInterfacePause from "@assets/img/interface/pause.svg";
import iconInterfacePlay from "@assets/img/interface/play.svg";
import iconInterfaceNext from "@assets/img/interface/next.svg";
import iconInterfaceEnd from "@assets/img/interface/end.svg";

type Interval = ReturnType<typeof setInterval>;

const hotkeyConfig: HotkeyOptions = { preventDefault: true };

function StateTreeTraverser({ className, style }: StateTreeTraverserProps) {
    const { t } = useTranslation("analysis");

    const { analysisGame } = useAnalysisGameStore();

    const {
        currentStateTreeNode,
        setCurrentStateTreeNode,
        autoplayEnabled,
        setAutoplayEnabled
    } = useAnalysisBoardStore();

    const autoplayIntervalRef = useRef<Interval>();

    useEffect(() => {
        if (autoplayEnabled) {
            traverseForwards();

            autoplayIntervalRef.current = setInterval(traverseForwards, 1000);
        } else {
            clearInterval(autoplayIntervalRef.current);
        }
    }, [autoplayEnabled]);

    function traverseToBeginning() {
        setCurrentStateTreeNode(analysisGame.stateTree);
        setAutoplayEnabled(false);
    }

    function traverseToEnd() {
        const finalNode = getNodeChain(analysisGame.stateTree).at(-1)
            || analysisGame.stateTree;

        setCurrentStateTreeNode(finalNode);
        playBoardSound(finalNode);
        setAutoplayEnabled(false);
    }

    function traverseBackwards() {
        if (!currentStateTreeNode.parent) return;

        setCurrentStateTreeNode(currentStateTreeNode.parent);
        playBoardSound(currentStateTreeNode);
        setAutoplayEnabled(false);
    }

    function traverseForwards() {
        setCurrentStateTreeNode(currentNode => {
            const priorityChild = currentNode.children.at(0);

            if (priorityChild) {
                playBoardSound(priorityChild);

                return priorityChild;
            } else {
                setAutoplayEnabled(false);

                return currentNode;
            }
        });
    }

    useHotkeys("up, shift+left", traverseToBeginning, hotkeyConfig);
    useHotkeys("down, shift+right", traverseToEnd, hotkeyConfig);
    useHotkeys("left", traverseBackwards, hotkeyConfig);
    useHotkeys("right", traverseForwards, hotkeyConfig);

    return <div className={`${styles.wrapper} ${className}`} style={style}>
        <button
            className={styles.controlButton}
            onClick={traverseToBeginning}
            title={t("stateTreeTraverser.beginning")}
            type="button"
        >
            <img src={iconInterfaceStart} width={26} height={26} />
        </button>

        <button
            className={styles.controlButton}
            onClick={traverseBackwards}
            title={t("stateTreeTraverser.back")}
            type="button"
        >
            <img src={iconInterfaceBack} width={26} height={26} />
        </button>

        <button
            className={`${styles.controlButton} ${autoplayEnabled ? styles.active : ""}`}
            onClick={() => setAutoplayEnabled(!autoplayEnabled)}
            title={autoplayEnabled
                ? t("stateTreeTraverser.pause")
                : t("stateTreeTraverser.play")
            }
            type="button"
        >
            <img width={26} height={26} src={autoplayEnabled
                ? iconInterfacePause
                : iconInterfacePlay
            }/>
        </button>

        <button
            className={styles.controlButton}
            onClick={traverseForwards}
            title={t("stateTreeTraverser.next")}
            type="button"
        >
            <img src={iconInterfaceNext} width={26} height={26} />
        </button>

        <button
            className={styles.controlButton}
            onClick={traverseToEnd}
            title={t("stateTreeTraverser.end")}
            type="button"
        >
            <img src={iconInterfaceEnd} width={26} height={26} />
        </button>
    </div>;
}

export default StateTreeTraverser;