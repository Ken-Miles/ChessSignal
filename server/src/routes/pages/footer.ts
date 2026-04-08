import { Router } from "express";

import appRouter from "@/lib/appRouter";

const router = Router();

router.get("/help", appRouter({
	bundleName: "helpCenter",
	meta: {
		title: "Help Center",
		description: "Get help with using WintrChess.",
		ogTitle: "♟️ WintrChess - Help Center",
		ogDescription: "Get help with using WintrChess."
	}
}));

router.get(/^\/(terms|privacy)/, appRouter({
	bundleName: "legal",
	meta: req => {
		const isPrivacy = req.path.startsWith("/privacy");

		return {
			title: isPrivacy ? "Privacy Policy" : "Terms of Service",
			description: isPrivacy
				? "Read the WintrChess privacy policy."
				: "Read the WintrChess terms of service.",
			ogTitle: isPrivacy
				? "♟️ WintrChess - Privacy Policy"
				: "♟️ WintrChess - Terms of Service",
			ogDescription: isPrivacy
				? "Read how WintrChess handles your data."
				: "Read the terms for using WintrChess."
		};
	}
}));

export default router;