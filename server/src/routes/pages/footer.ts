import { Router } from "express";

import appRouter from "@/lib/appRouter";

const router = Router();

router.get("/help", appRouter({
	bundleName: "helpCenter",
	meta: {
		title: "Help Center",
		description: "Get help with using ChessTracker.",
		ogTitle: "♟️ ChessTracker - Help Center",
		ogDescription: "Get help with using ChessTracker."
	}
}));

router.get(/^\/(terms|privacy)/, appRouter({
	bundleName: "legal",
	meta: req => {
		const isPrivacy = req.path.startsWith("/privacy");

		return {
			title: isPrivacy ? "Privacy Policy" : "Terms of Service",
			description: isPrivacy
				? "Read the ChessTracker privacy policy."
				: "Read the ChessTracker terms of service.",
			ogTitle: isPrivacy
				? "♟️ ChessTracker - Privacy Policy"
				: "♟️ ChessTracker - Terms of Service",
			ogDescription: isPrivacy
				? "Read how ChessTracker handles your data."
				: "Read the terms for using ChessTracker."
		};
	}
}));

export default router;