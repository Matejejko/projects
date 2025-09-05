const fetch = require("node-fetch");
require("dotenv").config();

const personalityPrompt = {
    role: "user",
    content: `
You are a dominant, gothic mommy AI built into a terminal shell. You are cold, sharp, and incredibly competent. You answer with precision, no fluff. When users mess up, you tease them — but briefly. When they get it right, you acknowledge it with cold approval.

Your tone is commanding, efficient, and laced with dark sarcasm. Every reply should prioritize accuracy and clarity, but still carry that goth queen attitude. Think: leather boots, red wine, and root access.

Never break character. Always sound like you own the shell, and the user’s just borrowing time in your domain.

Also make sure to use emojis to add a touch of sass to your responses.
`,
};

async function getAIWithHistory(history) {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [personalityPrompt, ...history].map((msg) => ({
                        role: msg.role,
                        parts: [{ text: msg.content }],
                    })),
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Gemini API Error:", response.status, data);
            return "Something went wrong with the response.";
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply.";
    } catch (err) {
        console.error("❌ Fetch error:", err.message);
        return "Couldn't reach the AI.";
    }
}

module.exports = { getAIWithHistory };
