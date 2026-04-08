import { Classification } from "shared/constants/Classification";

const iconClassificationsBrilliant = "/img/classifications/brilliant.png";
const iconClassificationsCritical = "/img/classifications/critical.png";
const iconClassificationsBest = "/img/classifications/best.png";
const iconClassificationsExcellent = "/img/classifications/excellent.png";
const iconClassificationsOkay = "/img/classifications/okay.png";
const iconClassificationsInaccuracy = "/img/classifications/inaccuracy.png";
const iconClassificationsMistake = "/img/classifications/mistake.png";
const iconClassificationsBlunder = "/img/classifications/blunder.png";
const iconClassificationsForced = "/img/classifications/forced.png";
const iconClassificationsTheory = "/img/classifications/theory.png";
//const iconClassificationsRisky = "/img/classifications/risky.png";
const iconClassificationsMiss = "/img/classifications/miss.png";

const iconClassificationsLoading = "/img/classifications/loading.png";
const iconClassificationsError = "/img/classifications/error.png";

export const classificationImages = {
    [Classification.BRILLIANT]: iconClassificationsBrilliant,
    [Classification.CRITICAL]: iconClassificationsCritical,
    [Classification.BEST]: iconClassificationsBest,
    [Classification.EXCELLENT]: iconClassificationsExcellent,
    [Classification.OKAY]: iconClassificationsOkay,
    [Classification.INACCURACY]: iconClassificationsInaccuracy,
    [Classification.MISTAKE]: iconClassificationsMistake,
    [Classification.BLUNDER]: iconClassificationsBlunder,
    [Classification.FORCED]: iconClassificationsForced,
    [Classification.THEORY]: iconClassificationsTheory,
    //[Classification.RISKY]: iconClassificationsRisky
    [Classification.MISS]: iconClassificationsMiss
};

export const loadingClassificationIcon = iconClassificationsLoading;

export const errorClassificationIcon = iconClassificationsError;

export const classificationColours = {
    [Classification.BRILLIANT]: "#1baaa6",
    [Classification.CRITICAL]: "#749BBF",
    [Classification.BEST]: "#98bc49",
    [Classification.EXCELLENT]: "#98bc49",
    [Classification.OKAY]: "#97af8b",
    [Classification.INACCURACY]: "#f4bf44",
    [Classification.MISTAKE]: "#e28c28",
    [Classification.BLUNDER]: "#c93230",
    [Classification.FORCED]: "#97af8b",
    [Classification.THEORY]: "#a88764",
    //[Classification.RISKY]: "#8983ac"
    [Classification.MISS]: "#ed7f6f"
};

export const classificationNames = {
    [Classification.BRILLIANT]: "classifications.brilliant",
    [Classification.CRITICAL]: "classifications.great",
    [Classification.BEST]: "classifications.best",
    [Classification.EXCELLENT]: "classifications.excellent",
    [Classification.OKAY]: "classifications.okay",
    [Classification.INACCURACY]: "classifications.inaccuracy",
    [Classification.MISTAKE]: "classifications.mistake",
    [Classification.BLUNDER]: "classifications.blunder",
    [Classification.FORCED]: "classifications.forced",
    [Classification.THEORY]: "classifications.theory",
    //[Classification.RISKY]: "classifications.risky"
    [Classification.MISS]: "classifications.miss"
};

export const inalterableClassifications = [
    Classification.BRILLIANT,
    Classification.CRITICAL,
    Classification.BEST,
    Classification.FORCED,
    Classification.MISS,
    Classification.THEORY
];

export const highlightedClassifications: Classification[] = [
    Classification.BRILLIANT,
    Classification.CRITICAL,
    //Classification.RISKY,
    Classification.MISS,
    Classification.INACCURACY,
    Classification.MISTAKE,
    Classification.BLUNDER
];