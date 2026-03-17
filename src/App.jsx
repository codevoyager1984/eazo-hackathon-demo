import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";

// ─── Eazo Bridge ──────────────────────────────────────────────────────────────
const BRIDGE_CHANNEL = "eazo:open-bridge";
const BRIDGE_VERSION = 1;
const pendingBridgeRequests = new Map();

function setupBridgeListener() {
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.channel !== BRIDGE_CHANNEL || msg.type !== "response") return;
    const task = pendingBridgeRequests.get(msg.requestId);
    if (!task) return;
    pendingBridgeRequests.delete(msg.requestId);
    if (msg.ok) task.resolve(msg.result);
    else task.reject(new Error(msg.error?.message || "Bridge error"));
  });
}

function callBridge(method, params = {}) {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    pendingBridgeRequests.set(requestId, { resolve, reject });
    const msg = { channel: BRIDGE_CHANNEL, type: "request", requestId, version: BRIDGE_VERSION, method, params };
    console.log("[eazo-bridge] →", msg);
    window.parent.postMessage(msg, "*");
    setTimeout(() => {
      if (pendingBridgeRequests.has(requestId)) {
        pendingBridgeRequests.delete(requestId);
        console.warn("[eazo-bridge] ✗ timeout for requestId:", requestId);
        reject(new Error("Bridge request timed out"));
      }
    }, 12000);
  });
}

setupBridgeListener();

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 56 }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "?")
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover border-2 border-white/10 flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-black border-2 border-white/10 flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #F97316 0%, #8B5CF6 100%)",
        color: "#fff",
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Terminal log ─────────────────────────────────────────────────────────────
function TerminalLog({ lines, phase }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (phase === "done" || phase === "error" || phase === "manual-form") return;
    const t = setInterval(() => setFrame((f) => (f + 1) % spinnerFrames.length), 100);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="w-full max-w-sm mx-auto font-mono text-xs">
      <div className="bg-[#0D1117] border border-white/10 rounded-xl p-5 space-y-1.5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-white/30 text-[10px] tracking-widest uppercase">eazo-auth</span>
        </div>
        {lines.map((line, i) => {
          const isWarn = line.startsWith("[warn]");
          const isInfo = line.startsWith("[info]") || line.startsWith(">");
          return (
            <div
              key={i}
              className="leading-relaxed"
              style={{ color: isWarn ? "#F59E0B" : isInfo ? "#4ADE80" : "#94A3B8" }}
            >
              {line}
            </div>
          );
        })}
        {phase !== "done" && phase !== "error" && phase !== "manual-form" && (
          <div className="text-[#F97316]">{spinnerFrames[frame]} processing...</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── Manual Input Form ────────────────────────────────────────────────────────
function ManualForm({ onSubmit, submitting }) {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onSubmit({ nickname: nickname.trim(), email: email.trim(), description: description.trim() });
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#F97316]/60 transition-colors";

  return (
    <div className="w-full max-w-sm mx-auto animate-card-in">
      <div className="bg-[#0D1117] border border-white/8 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-white font-bold text-base mb-1">Create Your Card</h2>
          <p className="text-white/35 text-xs leading-relaxed">
            Tell us about yourself and AI will generate your personalized hacker identity card.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
              Nickname <span className="text-[#F97316]">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. ByteWrangler"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 block">
              Describe Yourself
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Full-stack dev who loves Rust, commits at 2am, strong opinions about tabs vs spaces, side projects that never launch..."
              rows={4}
              className={`${inputClass} resize-none leading-relaxed`}
            />
            <p className="mt-1.5 text-[10px] text-white/20">
              The more you share, the more personalized the card.
            </p>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || submitting}
            className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6)", color: "#fff" }}
          >
            {submitting ? "Generating..." : "Generate My Card ⚡"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Hacker Card ─────────────────────────────────────────────────────────────
function HackerCard({ user, card, verified, onRegenerate, regenerating, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  const handleShare = () => {
    const text = `🃏 My Eazo Hacker Card\n🎭 ${card.archetype}\n💬 "${card.roast}"\n\nhttps://eazo.ai/build-weekend-jam-sf.html\n\n#EazoHackerCard`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0D1117",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `hacker-card-${(user.nickname || "card").replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-card-in w-full max-w-md mx-auto relative">
      {/* Close button - positioned absolutely outside the card */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      
      {/* Gradient border wrapper */}
      <div className="p-px rounded-2xl" style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6, #06B6D4)" }}>
        <div ref={cardRef} className="bg-[#0D1117] rounded-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-white/5" style={{ background: "linear-gradient(180deg, #12001A 0%, #0D1117 100%)" }}>
            <div className="flex items-center gap-4">
              <Avatar src={user.avatarUrl} name={user.nickname || user.email} size={52} />
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-base truncate">{user.nickname || "Hacker"}</div>
                {user.email && <div className="text-white/40 text-xs truncate">{user.email}</div>}
              </div>
              <div
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                style={
                  verified
                    ? { background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.3)" }
                    : { background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.3)" }
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: verified ? "#10B981" : "#F97316" }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: verified ? "#10B981" : "#F97316" }}
                >
                  {verified ? "Verified" : "Self-reported"}
                </span>
              </div>
            </div>

            {/* Archetype */}
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]/70 mb-1">Class</div>
              <div className="text-lg font-black text-white leading-tight">"{card.archetype}"</div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-3">

            {/* Totem */}
            <div className="flex items-center gap-3 bg-[#8B5CF6]/5 border border-[#8B5CF6]/15 rounded-xl p-3">
              <span className="text-2xl flex-shrink-0">🦾</span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]/60 mb-0.5">Spirit Totem</div>
                <div className="text-white font-bold text-sm leading-tight">{card.totem?.animal}</div>
                <div className="text-white/45 text-xs italic truncate">"{card.totem?.description}"</div>
              </div>
            </div>

            {/* Roast — hero section */}
            <div className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F97316]/60 font-mono">$ roast --user</span>
              </div>
              <div className="px-4 py-4">
                <p className="text-base text-white/90 font-mono italic leading-relaxed">"{card.roast}"</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-1 grid grid-cols-3 gap-2">
            <button
              onClick={handleShare}
              className="py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:border-[#1DA1F2]/60 hover:text-[#1DA1F2]"
              style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            >
              𝕏 Share
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{ borderColor: "rgba(139,92,246,0.4)", color: "#8B5CF6" }}
            >
              {downloading ? "..." : "↓ Save"}
            </button>
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6)", color: "#fff" }}
            >
              {regenerating ? "..." : "Reroll"}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-4 text-[10px] text-white/20 uppercase tracking-widest">
        Powered by Eazo × Gemini
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // phases: init | bridge-loading | verifying | authenticated | generating | done | manual-form | error
  const [phase, setPhase] = useState("init");
  const [user, setUser] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [regenerating, setRegenerating] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [userDescription, setUserDescription] = useState("");
  // userData saved for regenerate when using manual form
  const pendingUserData = useRef(null);

  const addLog = (line) => setLogLines((prev) => [...prev, line]);

  const generateCard = async (userData) => {
    addLog("> Analyzing hacker DNA...");
    addLog("> Consulting the Oracle (Gemini 2.5 Flash)...");

    const cardResp = await fetch("/api/generate-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: userData.nickname || userData.email?.split("@")[0] || "Hacker",
        email: userData.email || "",
        description: userData.description || "",
      }),
    });

    if (!cardResp.ok) {
      const body = await cardResp.json().catch(() => ({}));
      throw new Error(body.error || "Card generation failed");
    }
    return await cardResp.json();
  };

  const startBridgeFlow = async () => {
    setLogLines([]);
    setError(null);
    setCard(null);
    setVerified(false);

    setPhase("bridge-loading");
    addLog(`[info] Environment: in iframe`);
    addLog(`[info] Initializing Eazo bridge (channel: ${BRIDGE_CHANNEL})`);
    addLog(`[info] Bridge version: ${BRIDGE_VERSION}`);
    addLog(`[info] Sending request: session.getToken`);

    try {
      const payload = await callBridge("session.getToken");

      addLog(`[info] Bridge response received ✓`);
      addLog(`[info] Payload fields: ${Object.keys(payload).join(", ")}`);
      addLog(`[info] encryptedData length: ${payload.encryptedData?.length ?? "n/a"}`);
      addLog(`[info] algorithm: ${payload.algorithm ?? "n/a"}`);
      console.log("[eazo-bridge] ← payload:", payload);

      setPhase("verifying");
      addLog(`[info] Sending payload to /api/verify...`);

      const verifyResp = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!verifyResp.ok) {
        const body = await verifyResp.json().catch(() => ({}));
        throw new Error(body.error || "Credential verification failed");
      }

      const userData = await verifyResp.json();
      console.log("[eazo-bridge] verified user:", userData);
      addLog(`[info] Verified ✓`);
      addLog(`[info] userId: ${userData.userId}`);
      addLog(`[info] nickname: ${userData.nickname || "(none)"}`);
      addLog(`[info] email: ${userData.email || "(none)"}`);
      addLog(`[info] avatarUrl: ${userData.avatarUrl ? "present" : "none"}`);

      setUser(userData);
      setVerified(true);
      pendingUserData.current = userData;

      addLog(`[info] Ready to generate card`);
      setPhase("authenticated");
    } catch (err) {
      console.error("[eazo-bridge] error:", err);
      addLog(`[warn] Bridge failed: ${err.message}`);
      addLog(`[warn] Falling back to manual input...`);
      setPhase("manual-form");
    }
  };

  const handleManualSubmit = async (formData) => {
    setFormSubmitting(true);
    setLogLines([]);
    setError(null);

    const userData = {
      userId: null,
      email: formData.email,
      nickname: formData.nickname,
      avatarUrl: null,
      description: formData.description,
    };

    try {
      setPhase("generating");
      addLog(`[info] Manual mode — no bridge auth`);
      addLog(`[info] Nickname: ${userData.nickname}`);
      if (userData.email) addLog(`[info] Email: ${userData.email}`);
      if (userData.description) addLog(`[info] Self-description: ${userData.description.slice(0, 60)}...`);

      setUser(userData);
      setVerified(false);
      pendingUserData.current = userData;

      const cardData = await generateCard(userData);
      setCard(cardData);
      addLog(`[info] Card generated ✓`);
      setPhase("done");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setPhase("error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleGenerateCard = async () => {
    if (!pendingUserData.current) return;
    setPhase("generating");
    addLog("> Generating your hacker card...");
    if (userDescription.trim()) {
      addLog(`[info] Using custom description: ${userDescription.slice(0, 50)}...`);
    }
    try {
      const userData = { ...pendingUserData.current, description: userDescription.trim() };
      const cardData = await generateCard(userData);
      setCard(cardData);
      addLog(`[info] Card generated ✓`);
      setPhase("done");
    } catch (err) {
      console.error(err);
      setError(err.message || "Card generation failed");
      setPhase("error");
    }
  };

  const handleRegenerate = async () => {
    if (!pendingUserData.current) return;
    setRegenerating(true);
    try {
      const cardData = await generateCard(pendingUserData.current);
      setCard(cardData);
    } catch {
      // silently keep old card
    } finally {
      setRegenerating(false);
    }
  };

  const handleCloseCard = () => {
    setCard(null);
    setUserDescription(""); // Reset description when closing
    setPhase("authenticated");
  };

  useEffect(() => {
    const inIframe = window !== window.parent;
    console.log("[eazo-bridge] in iframe:", inIframe);
    if (inIframe) {
      startBridgeFlow();
    } else {
      setPhase("manual-form");
    }
  }, []);

  const isLoading = ["init", "bridge-loading", "verifying", "generating"].includes(phase);

  return (
    <div className="min-h-screen bg-[#020617] text-[#CBD5E1] font-sans selection:bg-[#F97316] selection:text-white">
      {/* Background glow orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">

        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6)" }}>
              ⚡
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">EAZO HACKER CARD</h1>
          </div>
          <p className="text-xs uppercase tracking-widest text-white/30">AI-Powered Developer Identity Generator</p>
        </header>

        {/* Loading */}
        {isLoading && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-pulse"
              style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(255,255,255,0.06)" }}>
              🃏
            </div>
            <TerminalLog lines={logLines} phase={phase} />
          </div>
        )}

        {/* Authenticated — show terminal + user card + generate button */}
        {phase === "authenticated" && user && (
          <div className="w-full flex flex-col items-center gap-6">
            <TerminalLog lines={logLines} phase={phase} />
            
            <div className="w-full max-w-sm mx-auto animate-card-in">
              <div className="bg-[#0D1117] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
                  <Avatar src={user.avatarUrl} name={user.nickname || user.email} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{user.nickname || "Hacker"}</div>
                    {user.email && <div className="text-white/40 text-xs truncate mt-0.5">{user.email}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Verified</span>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-2">
                      Describe yourself <span className="text-white/20">(optional)</span>
                    </label>
                    <textarea
                      value={userDescription}
                      onChange={(e) => setUserDescription(e.target.value)}
                      placeholder="e.g. Full-stack dev, loves Rust, commits at 2am, tabs > spaces..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#F97316]/60 transition-colors resize-none leading-relaxed"
                    />
                    <p className="mt-1.5 text-[10px] text-white/20">
                      The more you share, the more personalized the card.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateCard}
                    className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6)", color: "#fff" }}
                  >
                    Generate My Card ⚡
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual form */}
        {phase === "manual-form" && (
          <ManualForm onSubmit={handleManualSubmit} submitting={formSubmitting} />
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="w-full max-w-sm mx-auto text-center space-y-4">
            <div className="bg-red-950/40 border border-red-500/20 rounded-2xl p-6">
              <div className="text-2xl mb-3">⚠️</div>
              <p className="text-red-400 font-bold text-sm mb-1">Something went wrong</p>
              <p className="text-red-400/60 text-xs">{error}</p>
            </div>
            <button
              onClick={() => setPhase("manual-form")}
              className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Card */}
        {phase === "done" && card && user && (
          <HackerCard
            user={user}
            card={card}
            verified={verified}
            onRegenerate={handleRegenerate}
            regenerating={regenerating}
            onClose={verified ? handleCloseCard : null}
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-card-in {
          animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` }} />
    </div>
  );
}
