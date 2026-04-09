import { Router } from "express";

import { accountAuthenticator } from "@/lib/security/account";
import appRouter from "@/lib/appRouter";

const router = Router();

router.get(/^\/(signin|signup)/,
    appRouter({
        bundleName: "signin",
        meta: req => {
            const isSignUpPath = req.path.includes("signup");

            return {
                title: isSignUpPath ? "Sign Up" : "Sign In",
                description: isSignUpPath
                    ? "Create a ChessTracker account."
                    : "Sign in to your ChessTracker account.",
                ogTitle: isSignUpPath
                    ? "♟️ ChessTracker - Sign Up"
                    : "♟️ ChessTracker - Sign In",
                ogDescription: isSignUpPath
                    ? "Create an account to use ChessTracker features."
                    : "Sign in to continue on ChessTracker."
            };
        }
    })
);

// Profile page route disabled until the page is useful
// router.get("/profile/:username", async (req, res, next) => {
//     const user = await User.findOne({
//         username: req.params.username
//     });

//     if (!user) return next();

//     const profileRouter = appRouter(
//         "account/profile.html",
//         async req => req.params
//     );

//     profileRouter(req, res, next);
// });

router.get("/auth/reset-password",
    accountAuthenticator(true),
    appRouter({
        bundleName: "resetPassword",
        meta: {
            title: "Reset Password",
            description: "Set a new password for your ChessTracker account.",
            ogTitle: "♟️ ChessTracker - Reset Password",
            ogDescription: "Set a new password for your ChessTracker account."
        }
    })
);

export default router;