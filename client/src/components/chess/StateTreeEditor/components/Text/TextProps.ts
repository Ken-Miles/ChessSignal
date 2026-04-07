import { CSSProperties, ReactNode } from "react";

interface TextProps {
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}

export default TextProps;