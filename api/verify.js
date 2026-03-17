import { decrypt } from "@eazo/node-sdk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const privateKey = process.env.EAZO_PRIVATE_KEY;
  if (!privateKey) return res.status(500).json({ error: "Private key not configured" });

  const { encryptedData, encryptedKey, iv, authTag } = req.body || {};
  if (!encryptedData || !encryptedKey || !iv || !authTag) {
    return res.status(400).json({ error: "Missing required fields: encryptedData, encryptedKey, iv, authTag" });
  }

  try {
    const result = decrypt({ encryptedData, encryptedKey, iv, authTag, privateKey });
    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Decrypt error:", err.message);
    return res.status(400).json({ error: "Failed to decrypt session token" });
  }
}
