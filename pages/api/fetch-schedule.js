/**
 * @file fetch-schedule.js
 * @location cobot-plus-fyp/pages/api/fetch-schedule.js
 * 
 * @description
 * Server-side proxy to fetch IIUM schedule page.
 * Bypasses CORS restrictions for client-side fetching.
 */

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL is from IIUM domain for security
    if (!url.includes("myapps.iium.edu.my")) {
        return res.status(400).json({ error: "Only IIUM URLs are allowed" });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();

        res.status(200).json({ html });
    } catch (error) {
        console.error("Fetch schedule error:", error);
        res.status(500).json({ error: error.message || "Failed to fetch schedule" });
    }
}
