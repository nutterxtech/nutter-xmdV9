import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { pairBot, getBotStatus } from "@/lib/api";

export default function Connect() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  function startPolling(uid: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getBotStatus(uid);
        if (s.connected) {
          setConnected(true);
          clearInterval(pollRef.current!);
          clearInterval(countRef.current!);
          setTimeout(() => navigate("/dashboard"), 2000);
        }
      } catch (_) {}
    }, 3000);
  }

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    if (countRef.current) clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleGetCode() {
    setError("");
    const clean = phone.replace(/[^0-9]/g, "");
    if (!clean || clean.length < 7) {
      setError("Enter a valid phone number with country code (e.g. 2349012345678)");
      return;
    }
    setLoading(true);
    try {
      const result = await pairBot(clean);
      localStorage.setItem("nutter_user_id", result.userId);
      localStorage.setItem("nutter_user_token", result.userToken);
      setUserId(result.userId);

      if (result.pairingCode) {
        setPairingCode(result.pairingCode);
        startCountdown(180);
        startPolling(result.userId);
      } else {
        setConnected(true);
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate pairing code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const fmt = pairingCode ? pairingCode.slice(0, 4) + "-" + pairingCode.slice(4) : "";
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#080d1a",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "2rem 1rem",
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Back */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: "1.5rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          ← Back to home
        </button>
      </div>

      <div style={{
        width: "100%", maxWidth: 520,
        background: "#0d1a2e",
        border: "1px solid #1e3a5f",
        borderRadius: "1.25rem",
        padding: "2.5rem",
        boxShadow: "0 0 60px rgba(0,212,255,0.06)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⚡</div>
          <h1 style={{
            fontSize: "1.75rem", fontWeight: 900,
            background: "linear-gradient(135deg, #00d4ff, #a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "0.4rem"
          }}>Connect Your Bot</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Enter your WhatsApp number to get a linking code
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "0.75rem", padding: "0.875rem 1rem",
            color: "#fca5a5", fontSize: "0.875rem", marginBottom: "1.5rem"
          }}>❌ {error}</div>
        )}

        {connected ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ color: "#22c55e", fontWeight: 700, fontSize: "1.25rem" }}>Bot Connected!</h2>
            <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Redirecting to your dashboard...</p>
          </div>
        ) : !pairingCode ? (
          <>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                placeholder="e.g. 2349012345678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGetCode()}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#0a1628", border: "1px solid #1e3a5f",
                  color: "#e2e8f0", borderRadius: "0.75rem",
                  padding: "0.875rem 1rem", fontSize: "1.05rem",
                  outline: "none"
                }}
              />
              <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.4rem" }}>
                Include country code — no + or spaces. Example: 234 for Nigeria
              </p>
            </div>

            <button
              onClick={handleGetCode}
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#1e3a5f" : "linear-gradient(135deg, #00d4ff, #a855f7)",
                color: "white", fontWeight: 800, border: "none",
                borderRadius: "0.75rem", padding: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1.05rem", marginBottom: "1.5rem",
                boxShadow: loading ? "none" : "0 0 24px rgba(0,212,255,0.2)"
              }}
            >
              {loading ? "⏳ Generating code..." : "🔑 Get Pairing Code"}
            </button>

            <div style={{
              background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)",
              borderRadius: "0.75rem", padding: "1rem"
            }}>
              <p style={{ color: "#a78bfa", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem" }}>📋 How pairing works:</p>
              <ol style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.8, paddingLeft: "1.1rem", margin: 0 }}>
                <li>Enter your number and tap <strong style={{ color: "#94a3b8" }}>Get Pairing Code</strong></li>
                <li>WhatsApp will prompt you to enter a code (if you initiated from your phone)</li>
                <li>In WhatsApp: <strong style={{ color: "#94a3b8" }}>Settings → Linked Devices → Link a Device → Link with Phone Number</strong></li>
                <li>Enter the 8-digit code shown</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Your pairing code for <strong style={{ color: "#e2e8f0" }}>+{phone}</strong>
              </p>

              <div style={{
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: "1rem",
                padding: "2rem 1.5rem",
                marginBottom: "1rem"
              }}>
                <div style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "3rem", fontWeight: 900,
                  letterSpacing: "0.4rem",
                  color: "#00d4ff",
                  textShadow: "0 0 24px rgba(0,212,255,0.5)"
                }}>{fmt}</div>
                <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.75rem" }}>
                  Enter this code exactly in WhatsApp
                </p>
              </div>

              {countdown > 0 ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  background: countdown < 30 ? "rgba(239,68,68,0.08)" : "rgba(0,212,255,0.06)",
                  border: `1px solid ${countdown < 30 ? "rgba(239,68,68,0.2)" : "rgba(0,212,255,0.15)"}`,
                  borderRadius: "100px", padding: "0.3rem 0.875rem",
                  color: countdown < 30 ? "#fca5a5" : "#00d4ff",
                  fontSize: "0.85rem", fontWeight: 600
                }}>
                  ⏱ Expires in {mins}:{secs.toString().padStart(2, "0")}
                </div>
              ) : (
                <div style={{ color: "#ef4444", fontSize: "0.85rem" }}>Code expired. Request a new one below.</div>
              )}
            </div>

            <div style={{
              background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)",
              borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1.5rem"
            }}>
              <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.6rem" }}>
                📱 Steps to link:
              </p>
              <ol style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 2, paddingLeft: "1.1rem", margin: 0 }}>
                <li>Open <strong style={{ color: "#e2e8f0" }}>WhatsApp</strong> on your phone</li>
                <li>Tap <strong style={{ color: "#e2e8f0" }}>Settings</strong> (or the 3 dots on Android)</li>
                <li>Go to <strong style={{ color: "#e2e8f0" }}>Linked Devices</strong></li>
                <li>Tap <strong style={{ color: "#e2e8f0" }}>Link a Device</strong></li>
                <li>Tap <strong style={{ color: "#e2e8f0" }}>Link with Phone Number</strong> instead</li>
                <li>Enter <strong style={{ color: "#00d4ff" }}>{fmt}</strong></li>
              </ol>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#f59e0b", boxShadow: "0 0 6px #f59e0b",
                display: "inline-block", flexShrink: 0
              }} />
              <span style={{ color: "#fcd34d", fontSize: "0.82rem" }}>
                Waiting for you to link in WhatsApp... polling every 3s
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => { setPairingCode(null); setUserId(null); setCountdown(0); }}
                style={{
                  flex: 1,
                  background: "rgba(71,85,105,0.2)", border: "1px solid #1e3a5f",
                  color: "#94a3b8", borderRadius: "0.75rem",
                  padding: "0.75rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem"
                }}
              >
                ← Try Different Number
              </button>
              {userId && (
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    flex: 1,
                    background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                    color: "#00d4ff", borderRadius: "0.75rem",
                    padding: "0.75rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem"
                  }}
                >
                  Go to Dashboard →
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p style={{ color: "#334155", fontSize: "0.78rem", marginTop: "1.5rem", textAlign: "center" }}>
        ⚡ NUTTER-XMD V.9.1.3 &nbsp;·&nbsp;
        <a href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?mode=gi_t" target="_blank" rel="noreferrer" style={{ color: "#25D166", textDecoration: "none" }}>Join Community</a>
      </p>
    </div>
  );
}
