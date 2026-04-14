import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import { floor, clamp } from "lodash-es";

import EngineVersion from "shared/constants/EngineVersion";
import EngineArrowType from "@analysis/constants/EngineArrowType";
import { isEngineVersionAvailable } from "@analysis/lib/engineVersionAvailability";
import useSettingsStore from "@/stores/SettingsStore";
import LogMessage from "@/components/common/LogMessage";
import DropdownSetting from "@/components/settings/DropdownSetting";
import NumberSetting from "@/components/settings/NumberSetting";

import * as styles from "../SettingsDialog.module.css";

interface EngineVersionOption {
    label: string;
    value: EngineVersion | "off";
}

const engineVersionOptions: EngineVersionOption[] = [
    {
        label: "Stockfish 18 Lite (Recommended)",
        value: EngineVersion.STOCKFISH_18_LITE
    },
    {
        label: "Stockfish 18 Lite Single",
        value: EngineVersion.STOCKFISH_18_LITE_SINGLE
    },
    {
        label: "Stockfish 18 ASM (Compatibility)",
        value: EngineVersion.STOCKFISH_18_ASM
    },
    {
        label: "Stockfish 18 Single",
        value: EngineVersion.STOCKFISH_18_SINGLE
    },
    {
        label: "Stockfish 18 (113 MB)",
        value: EngineVersion.STOCKFISH_18
    },
    {
        label: "Stockfish 17 Lite (Recommended)",
        value: EngineVersion.STOCKFISH_17_LITE
    },
    {
        label: "Stockfish 17 ASM",
        value: EngineVersion.STOCKFISH_17_ASM
    },
    {
        label: "Stockfish 17 (68 MB)",
        value: EngineVersion.STOCKFISH_17
    },
    {
        label: "Engine Off",
        value: "off"
    }
];

const timeLimitOptions = [
    { label: "3 sec", value: 3 },
    { label: "5 sec", value: 5 },
    { label: "10 sec", value: 10 },
    { label: "20 sec", value: 20 },
    { label: "30 sec", value: 30 },
    { label: "Unlimited", value: 0 }
];

const lineCountOptions = [
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
    { label: "4", value: 4 },
    { label: "5", value: 5 }
];

function EngineOptionsArea() {
    const { t, i18n } = useTranslation(["analysis", "common"]);

    const { settings, setSettings } = useSettingsStore();

    const [filteredEngineVersionOptions, setFilteredEngineVersionOptions] = useState(
        engineVersionOptions
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const checks = await Promise.all(engineVersionOptions.map(async option => {
                if (option.value == "off") {
                    return true;
                }

                return await isEngineVersionAvailable(option.value);
            }));

            if (cancelled) {
                return;
            }

            const availableOptions = engineVersionOptions.filter((_, index) => checks[index]);
            setFilteredEngineVersionOptions(availableOptions);

            if (!settings.analysis.engine.enabled) {
                return;
            }

            const selectedAvailable = availableOptions.some(option => (
                option.value == settings.analysis.engine.version
            ));

            if (!selectedAvailable) {
                setSettings(draft => {
                    draft.analysis.engine.enabled = false;
                    return draft;
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [settings.analysis.engine.enabled, settings.analysis.engine.version, setSettings]);

    const engineArrowsOptions = useMemo(() => [
        {
            label: t("disabled", { ns: "common" }),
            value: EngineArrowType.DISABLED
        },
        {
            label: t("settings.engine.suggestionArrows.continuation"),
            value: EngineArrowType.TOP_CONTINUATION
        },
        {
            label: t("settings.engine.suggestionArrows.alternative"),
            value: EngineArrowType.TOP_ALTERNATIVE
        }
    ], [i18n.language]);

    return <>
        <span className={styles.header}>
            {t("settings.engine.title")}
        </span>

        <div className={styles.setting}>
            <span data-tooltip-id="settings-engine-version">
                Chess Engine
            </span>

            <Tooltip
                id="settings-engine-version"
                content={t("settings.engine.descriptions.version")}
                delayShow={500}
                className={styles.settingDescription}
            />

            <DropdownSetting
                options={filteredEngineVersionOptions}
                defaultValue={filteredEngineVersionOptions.find(option => (
                    settings.analysis.engine.enabled
                        ? option.value == settings.analysis.engine.version
                        : option.value == "off"
                )) || filteredEngineVersionOptions.find(option => option.value == "off")}
                onSelect={option => {
                    if (!option) return;

                    setSettings(draft => {
                        if (option.value == "off") {
                            draft.analysis.engine.enabled = false;
                            return draft;
                        }

                        draft.analysis.engine.enabled = true;
                        draft.analysis.engine.version = option.value as EngineVersion;
                        return draft;
                    });
                }}
                dropdownStyle={{ width: "220px" }}
            />
        </div>

        <div className={styles.setting}>
            <span data-tooltip-id="settings-engine-time-limit">
                Maximum Time
            </span>

            <Tooltip
                id="settings-engine-time-limit"
                content={t("settings.engine.descriptions.timeLimit")}
                delayShow={500}
                className={styles.settingDescription}
            />

            <DropdownSetting
                options={timeLimitOptions}
                defaultValue={timeLimitOptions.find(option => (
                    !settings.analysis.engine.timeLimitEnabled
                        ? option.value == 0
                        : option.value == settings.analysis.engine.timeLimit
                ))}
                onSelect={option => {
                    if (!option) return;

                    setSettings(draft => {
                        if (option.value == 0) {
                            draft.analysis.engine.timeLimitEnabled = false;
                            return draft;
                        }

                        draft.analysis.engine.timeLimitEnabled = true;
                        draft.analysis.engine.timeLimit = option.value;
                        return draft;
                    });
                }}
                dropdownStyle={{ width: "220px" }}
            />
        </div>

        <div className={styles.setting}>
            <span data-tooltip-id="settings-engine-lines">
                Number of Lines
            </span>

            <Tooltip
                id="settings-engine-lines"
                content={t("settings.engine.descriptions.lines")}
                delayShow={500}
                className={styles.settingDescription}
            />

            <DropdownSetting
                options={lineCountOptions}
                defaultValue={lineCountOptions.find(
                    option => option.value == settings.analysis.engine.lines
                )}
                onSelect={option => {
                    if (!option) return;

                    setSettings(draft => {
                        draft.analysis.engine.lines = option.value;
                        return draft;
                    });
                }}
                dropdownStyle={{ width: "220px" }}
            />
        </div>

        <div className={styles.setting}>
            <span data-tooltip-id="settings-engine-depth">
                {t("settings.engine.depth")}
            </span>

            <Tooltip
                id="settings-engine-depth"
                content={t("settings.engine.descriptions.depth")}
                delayShow={500}
                className={styles.settingDescription}
            />

            <NumberSetting
                min={10}
                max={99}
                defaultValue={settings.analysis.engine.depth}
                onChange={value => (
                    setSettings(draft => {
                        draft.analysis.engine.depth = floor(
                            clamp(value, 10, 99)
                        );
                        return draft;
                    })
                )}
                style={{ width: "180px" }}
            />
        </div>

        {settings.analysis.engine.lines < 2
            && <LogMessage theme="warn">
                {t("settings.engine.linesWarning")}
            </LogMessage>
        }

        <div className={styles.setting}>
            <span data-tooltip-id="settings-engine-suggestion-arrows">
                {t("settings.engine.suggestionArrows.title")}
            </span>

            <Tooltip
                id="settings-engine-suggestion-arrows"
                delayShow={500}
                className={styles.settingDescription}
            >
                {t("settings.engine.descriptions.suggestionArrows.disabled")}
                <br/><br/>
                {t("settings.engine.descriptions.suggestionArrows.continuation")}
                <br/><br/>
                {t("settings.engine.descriptions.suggestionArrows.alternative")}
            </Tooltip>

            <DropdownSetting
                defaultValue={engineArrowsOptions.find(option => (
                    option.value == settings.analysis.engine.suggestionArrows
                ))}
                options={engineArrowsOptions}
                onSelect={option => {
                    if (!option) return;

                    setSettings(draft => {
                        draft.analysis.engine.suggestionArrows = option.value;
                        return draft;
                    });
                }}
                dropdownStyle={{ width: "220px" }}
            />
        </div>
    </>;
}

export default EngineOptionsArea;