import { Router } from "express";

import appRouter from "@/lib/appRouter";

const router = Router();

router.get("/help", appRouter({
	bundleName: "helpCenter",
	meta: {
		title: "Help Center",
		description: "Get help with using ChessSignal.",
		ogTitle: "♟️ ChessSignal - Help Center",
		ogDescription: "Get help with using ChessSignal."
	}
}));

router.get(/^\/(terms|privacy)/, appRouter({
	bundleName: "legal",
	meta: req => {
		const isPrivacy = req.path.startsWith("/privacy");

		return {
			title: isPrivacy ? "Privacy Policy" : "Terms of Service",
			description: isPrivacy
				? "Read the ChessSignal privacy policy."
				: "Read the ChessSignal terms of service.",
			ogTitle: isPrivacy
				? "♟️ ChessSignal - Privacy Policy"
				: "♟️ ChessSignal - Terms of Service",
			ogDescription: isPrivacy
				? "Read how ChessSignal handles your data."
				: "Read the terms for using ChessSignal."
		};
	}
}));

export default router;