import { useLocation } from "wouter";

const FEATURES = [
  {
    icon: "🤖",
    title: "103 Smart Commands",
    desc: "Full suite of AI, media, fun, group management, and utility commands. Trigger with your custom prefix.",
    color: "#00d4ff",
  },
  {
    icon: "🛡️",
    title: "Advanced Protection",
    desc: "Anti-call, anti-link, anti-spam, anti-delete, anti-sticker, anti-bad-word — keep your chats clean.",
    color: "#a855f7",
  },
  {
    icon: "🔗",
    title: "Phone Number Pairing",
    desc: "No QR scan needed. Generate an 8-digit code and link your WhatsApp in seconds.",
    color: "#22c55e",
  },
  {
    icon: "👥",
    title: "Group Management",
    desc: "Welcome & goodbye messages, admin tools, kick, promote, demote — full control when bot is admin.",
    color: "#f59e0b",
  },
  {
    icon: "🌐",
    title: "Always Online",
    desc: "Stay always available, auto-view & like status updates, auto-read messages, auto typing indicator.",
    color: "#ec4899",
  },
  {
    icon: "🧠",
    title: "AI & Downloads",
    desc: "Integrated AI chat, YouTube/TikTok/IG downloads, audio tools, web search, and more.",
    color: "#06b6d4",
  },
  {
    icon: "⚙️",
    title: "Full Dashboard",
    desc: "Manage all 15+ settings from a sleek web dashboard. Toggle features live, no restart needed.",
    color: "#8b5cf6",
  },
  {
    icon: "🔐",
    title: "Multi-User Platform",
    desc: "Each user gets their own isolated bot session. Admin panel to manage all users and sessions.",
    color: "#ef4444",
  },
];

const STEPS = [
  { num: "01", title: "Enter Your Number", desc: "Type your WhatsApp number with country code (e.g. 2349012345678)." },
  { num: "02", title: "Get Pairing Code", desc: "We generate an 8-digit code via Baileys. Code expires in 3 minutes." },
  { num: "03", title: "Link in WhatsApp", desc: "Go to WhatsApp → Settings → Linked Devices → Link with Phone Number → Enter code." },
  { num: "04", title: "Configure & Go", desc: "Toggle features, set your prefix, and let NUTTER-XMD run your chats." },
];

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div style={{ backgroundColor: "#080d1a", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 2rem",
        background: "rgba(8,13,26,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,212,255,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚡</span>
          <span style={{
            fontWeight: 900, fontSize: "1.2rem",
            background: "linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>NUTTER-XMD</span>
          <span style={{ color: "#334155", fontSize: "0.75rem", marginLeft: "0.25rem" }}>V.9.1.3</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?mode=gi_t"
            target="_blank" rel="noreferrer"
            style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none", padding: "0.4rem 0.75rem" }}
          >Community</a>
          <a
            href="https://whatsapp.com/channel/0029VbCcIrFEAKWNxpi8qR2V"
            target="_blank" rel="noreferrer"
            style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none", padding: "0.4rem 0.75rem" }}
          >Channel</a>
          <button
            onClick={() => navigate("/connect")}
            style={{
              background: "linear-gradient(135deg, #00d4ff, #a855f7)",
              color: "white", fontWeight: 700, border: "none",
              borderRadius: "0.5rem", padding: "0.5rem 1.25rem",
              cursor: "pointer", fontSize: "0.875rem"
            }}
          >Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: "center", padding: "6rem 1.5rem 4rem",
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 70%)",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", top: "10%", left: "10%", width: 300, height: 300,
          background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", top: "20%", right: "8%", width: 200, height: 200,
          background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none"
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: "100px", padding: "0.35rem 1rem", marginBottom: "1.5rem",
          fontSize: "0.8rem", color: "#00d4ff", fontWeight: 600
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00d4ff", display: "inline-block", boxShadow: "0 0 6px #00d4ff" }} />
          V.9.1.3 — Now Live
        </div>

        <h1 style={{
          fontSize: "clamp(2.5rem, 8vw, 5rem)", fontWeight: 900,
          lineHeight: 1.05, marginBottom: "1.5rem",
          letterSpacing: "-0.03em"
        }}>
          <span style={{
            background: "linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>NUTTER-XMD</span>
          <br />
          <span style={{ color: "#e2e8f0" }}>WhatsApp Bot</span>
        </h1>

        <p style={{
          fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: "#94a3b8",
          maxWidth: 600, margin: "0 auto 2.5rem", lineHeight: 1.7
        }}>
          The most powerful multi-user WhatsApp automation platform. 103 commands, full protection suite, AI integration — all managed from one sleek dashboard.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/connect")}
            style={{
              background: "linear-gradient(135deg, #00d4ff, #a855f7)",
              color: "white", fontWeight: 800, border: "none",
              borderRadius: "0.75rem", padding: "0.875rem 2.5rem",
              cursor: "pointer", fontSize: "1.1rem",
              boxShadow: "0 0 30px rgba(0,212,255,0.25)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 0 40px rgba(0,212,255,0.4)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = ""; (e.target as HTMLElement).style.boxShadow = "0 0 30px rgba(0,212,255,0.25)"; }}
          >
            ⚡ Connect Your Bot
          </button>
          <a
            href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?mode=gi_t"
            target="_blank" rel="noreferrer"
            style={{
              background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)",
              color: "#25D166", fontWeight: 700,
              borderRadius: "0.75rem", padding: "0.875rem 2.5rem",
              cursor: "pointer", fontSize: "1.1rem",
              textDecoration: "none", display: "inline-block"
            }}
          >
            💬 Join Community
          </a>
        </div>

        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginTop: "3rem", flexWrap: "wrap" }}>
          {[["103+", "Commands"], ["15+", "Auto Features"], ["24/7", "Always On"], ["Free", "Open Source"]].map(([val, lbl]) => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#00d4ff" }}>{val}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "4rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: "#e2e8f0", marginBottom: "0.75rem" }}>
            Everything You Need
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: 500, margin: "0 auto" }}>
            A complete WhatsApp automation toolkit with protection, AI, and full group control.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {FEATURES.map(feat => (
            <div
              key={feat.title}
              style={{
                background: "#0d1a2e",
                border: `1px solid ${feat.color}22`,
                borderRadius: "1rem",
                padding: "1.5rem",
                transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                cursor: "default"
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = feat.color + "55";
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = `0 8px 30px ${feat.color}11`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = feat.color + "22";
                el.style.transform = "";
                el.style.boxShadow = "";
              }}
            >
              <div style={{
                fontSize: "2rem", marginBottom: "0.75rem",
                width: 56, height: 56, display: "flex", alignItems: "center",
                justifyContent: "center",
                background: feat.color + "11",
                borderRadius: "0.75rem",
                border: `1px solid ${feat.color}22`
              }}>{feat.icon}</div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.4rem" }}>
                {feat.title}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        padding: "4rem 1.5rem",
        background: "linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.02) 50%, transparent 100%)"
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: "#e2e8f0", marginBottom: "0.75rem" }}>
              Up in 60 Seconds
            </h2>
            <p style={{ color: "#64748b" }}>No QR code. No app install. Just a phone number.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ position: "relative" }}>
                {i < STEPS.length - 1 && (
                  <div style={{
                    display: "none",
                  }} />
                )}
                <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "1rem", padding: "1.5rem", height: "100%" }}>
                  <div style={{
                    fontSize: "2.5rem", fontWeight: 900,
                    background: "linear-gradient(135deg, #00d4ff, #a855f7)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    lineHeight: 1, marginBottom: "0.75rem"
                  }}>{step.num}</div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.4rem" }}>{step.title}</h3>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section style={{ padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            <a
              href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?mode=gi_t"
              target="_blank" rel="noreferrer"
              style={{
                display: "block", textDecoration: "none",
                background: "linear-gradient(135deg, rgba(37,211,102,0.08), rgba(37,211,102,0.03))",
                border: "1px solid rgba(37,211,102,0.25)",
                borderRadius: "1.25rem", padding: "2rem",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 12px 40px rgba(37,211,102,0.12)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = ""; }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💬</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#25D166", marginBottom: "0.5rem" }}>
                Join WhatsApp Group
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
                Get updates, share commands, get help from the community. Click to join instantly.
              </p>
              <div style={{ marginTop: "1rem", color: "#25D166", fontSize: "0.85rem", fontWeight: 600 }}>
                Join Now →
              </div>
            </a>

            <a
              href="https://whatsapp.com/channel/0029VbCcIrFEAKWNxpi8qR2V"
              target="_blank" rel="noreferrer"
              style={{
                display: "block", textDecoration: "none",
                background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.03))",
                border: "1px solid rgba(0,212,255,0.25)",
                borderRadius: "1.25rem", padding: "2rem",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 12px 40px rgba(0,212,255,0.12)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = ""; }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📢</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#00d4ff", marginBottom: "0.5rem" }}>
                Follow Channel
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
                Stay updated on new features, bot updates, and announcements via the official channel.
              </p>
              <div style={{ marginTop: "1rem", color: "#00d4ff", fontSize: "0.85rem", fontWeight: 600 }}>
                Follow Now →
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        textAlign: "center", padding: "5rem 1.5rem",
        background: "radial-gradient(ellipse 70% 80% at 50% 100%, rgba(168,85,247,0.06) 0%, transparent 70%)"
      }}>
        <h2 style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 900, color: "#e2e8f0", marginBottom: "1rem" }}>
          Ready to automate WhatsApp?
        </h2>
        <p style={{ color: "#64748b", marginBottom: "2rem", fontSize: "1rem" }}>
          Connect in under a minute. Free. No app needed.
        </p>
        <button
          onClick={() => navigate("/connect")}
          style={{
            background: "linear-gradient(135deg, #00d4ff, #a855f7)",
            color: "white", fontWeight: 800, border: "none",
            borderRadius: "0.75rem", padding: "1rem 3rem",
            cursor: "pointer", fontSize: "1.15rem",
            boxShadow: "0 0 40px rgba(168,85,247,0.3)"
          }}
        >
          ⚡ Connect Your Bot Free
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #1e3a5f", padding: "2rem 1.5rem",
        textAlign: "center", color: "#334155", fontSize: "0.8rem"
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <a href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?mode=gi_t" target="_blank" rel="noreferrer" style={{ color: "#25D166", textDecoration: "none" }}>💬 Community Group</a>
          <a href="https://whatsapp.com/channel/0029VbCcIrFEAKWNxpi8qR2V" target="_blank" rel="noreferrer" style={{ color: "#00d4ff", textDecoration: "none" }}>📢 Official Channel</a>
        </div>
        ⚡ NUTTER-XMD V.9.1.3 — Multi-user WhatsApp Bot Platform
      </footer>
    </div>
  );
}
