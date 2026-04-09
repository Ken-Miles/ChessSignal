import React, { CSSProperties, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ToastContainer } from "react-toastify";

import useSettingsStore from "@/stores/SettingsStore";
import useAnnouncement from "@/hooks/api/useAnnouncement";
import useAnalyticsTag from "@/hooks/useAnalyticsTag";
import Announcement from "@/components/layout/Announcement";
import NavigationBar from "@/components/layout/NavigationBar";
import Footer from "@/components/layout/Footer";
import BugReportingWidget from "@/components/BugReportingWidget";

import PageWrapperProps from "./PageWrapperProps";
import * as styles from "./PageWrapper.module.css";

const queryClient = new QueryClient();

function PageWrapper({
    children,
    className,
    style,
    contentClassName,
    contentStyle,
    footerClassName,
    footerStyle
}: PageWrapperProps) {
    useAnalyticsTag();

    const bugReportingMode = useSettingsStore(
        state => state.settings.bugReportingMode
    );
    const appBackground = useSettingsStore(
        state => state.settings.themes.appBackground
    );

    const { announcement, status: announcementStatus } = useAnnouncement();

    const [ announcementOpen, setAnnouncementOpen ] = useState(true);

    const wrapperStyle = useMemo<CSSProperties>(() => {
        if (!appBackground) {
            return style || {};
        }

        return {
            ...style,
            backgroundImage: `linear-gradient(rgba(16, 18, 22, 0.55), rgba(16, 18, 22, 0.55)), url('/img/chessboards/themes/${appBackground}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed"
        };
    }, [appBackground, style]);

    return <QueryClientProvider client={queryClient}>
        <div className={className} style={wrapperStyle}>
            {announcementOpen && announcementStatus == "success"
                && <Announcement
                    style={{ zIndex: 99 }}
                    setOpen={setAnnouncementOpen}
                    colour={announcement.colour}
                >
                    <ReactMarkdown className={styles.announcementMarkdown}>
                        {announcement.content}
                    </ReactMarkdown>
                </Announcement>
            }

            <NavigationBar/>

            <div
                className={`${styles.content} ${contentClassName}`}
                style={contentStyle}
            >
                {children}
            </div>

            <Footer className={footerClassName} style={footerStyle} />

            {bugReportingMode && <BugReportingWidget/>}

            <ToastContainer/>
        </div>
    </QueryClientProvider>;
}

export default PageWrapper;