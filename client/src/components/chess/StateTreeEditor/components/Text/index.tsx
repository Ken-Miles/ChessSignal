import React from "react";

import TextProps from "./TextProps";
import * as styles from "./Text.module.css";

function Text({ className, children, style }: TextProps) {
    return <span className={`${styles.text} ${className || ""}`} style={style}>
        {children}
    </span>;
}

export default Text;