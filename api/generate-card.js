const SYSTEM_PROMPT = `You are a witty AI that generates personalized "Developer Identity Cards" for hackathon participants.

Given a developer's nickname, email, and optional self-description, create a creative, funny, slightly roast-style identity card.
The email domain gives hints about background (gmail = indie dev, company domain = enterprise, edu = student, etc.)
If a self-description is provided, use it as the PRIMARY source for personalization — pick up on specific technologies, habits, and personality cues mentioned.

Return a JSON object with EXACTLY this structure:
{
  "archetype": "A dramatic 3-5 word developer title, e.g. 'The Nocturnal Debugger'",
  "totem": {
    "animal": "A funny spirit animal name, e.g. 'Caffeinated Raccoon' (2-4 words)",
    "description": "One punchy sentence, max 8 words"
  },
  "roast": "Two sentences max. Sharp, funny, affectionate. Make it memorable — this is the headline of the card."
}

Rules:
- Be clever and tech-specific. Reference real programming culture, tools, or memes.
- Keep every field SHORT and punchy.
- The roast is the star — make it genuinely funny, not generic.
- Return ONLY the JSON object, no markdown, no code blocks, no explanation.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

  const { nickname, email, description } = req.body || {};
  if (!nickname && !email) return res.status(400).json({ error: "nickname or email required" });

  const userPrompt = `Developer info:
- Nickname: ${nickname || "Unknown Hacker"}
- Email: ${email || "unknown@example.com"}${description ? `\n- Self-description: ${description}` : ""}

Generate their hacker identity card.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return res.status(response.status).json({ error: "AI generation failed" });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) return res.status(502).json({ error: "Empty response from AI" });

    return res.status(200).json(JSON.parse(responseText));
  } catch (err) {
    console.error("generate-card error:", err.message);
    return res.status(500).json({ error: "Card generation failed" });
  }
}
