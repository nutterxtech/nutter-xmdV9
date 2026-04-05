import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  getToken, clearToken,
  getMe, getBots, createBot, deleteBot, renameBot,
  startPairing, startQR, getQR, getBotStatus, getBotSettings, updateBotSettings, disconnectBot,
  type Account, type Bot,
} from "@/lib/api";

const TOGGLE_FEATURES = [
  { key: "anticall", label: "Anti Call", icon: "📵", desc: "Reject incoming calls automatically", group: "Protection" },
  { key: "antilink", label: "Anti Link", icon: "🔗", desc: "Remove links shared in groups", group: "Protection" },
  { key: "antisticker", label: "Anti Sticker", icon: "🎭", desc: "Remove stickers in groups", group: "Protection" },
  { key: "antitag", label: "Anti Tag", icon: "🏷️", desc: "Block mass-tag messages", group: "Protection" },
  { key: "antibadword", label: "Anti Bad Word", icon: "🤬", desc: "Filter and remove offensive words", group: "Protection" },
  { key: "antispam", label: "Anti Spam", icon: "🛡️", desc: "Kick spammers automatically", group: "Protection" },
  { key: "antidelete", label: "Anti Delete", icon: "🔄", desc: "Recover deleted messages", group: "Protection" },
  { key: "chatbot", label: "Auto Reply", icon: "🤖", desc: "Auto-reply to DMs when away", group: "Automation" },
  { key: "autoread", label: "Auto Read", icon: "👁️", desc: "Auto-read all incoming messages", group: "Automation" },
  { key: "alwaysonline", label: "Always Online", icon: "🟢", desc: "Stay always online on WhatsApp", group: "Automation" },
  { key: "autoviewstatus", label: "Auto View Status", icon: "👀", desc: "Auto-view all status updates", group: "Automation" },
  { key: "autolikestatus", label: "Auto Like Status", icon: "❤️", desc: "React to status updates", group: "Automation" },
  { key: "autotype", label: "Typing Indicator", icon: "⌨️", desc: "Show typing when responding", group: "Automation" },
  { key: "welcome", label: "Welcome Message", icon: "👋", desc: "Greet new group members", group: "Groups" },
  { key: "goodbye", label: "Goodbye Message", icon: "💫", desc: "Farewell message on leave", group: "Groups" },
];

type LinkMode = "qr" | "pair" | null;
type ActiveTab = "bots" | "settings";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [account, setAccount] = useState<Account | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("bots");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingBot, setAddingBot] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [addError, setAddError] = useState("");
  const [linkMode, setLinkMode] = useState<Record<string, LinkMode>>({});
  const [pairingPhone, setPairingPhone] = useState<Record<string, string>>({});
  const [pairingCode, setPairingCode] = useState<Record<string, string | null>>({});
  const [pairingCountdown, setPairingCountdown] = useState<Record<string, number>>({});
  const [qrImage, setQrImage] = useState<Record<string, string | null>>({});
  const [linkLoading, setLinkLoading] = useState<Record<string, boolean>>({});
  const [linkError, setLinkError] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [renaming, setRenaming] = useState<Record<string, boolean>>({});
  const [renameName, setRenameName] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, boolean>>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrPollRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const countdownRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const token = getToken();

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadAll();
    pollRef.current = setInterval(refreshBotStatuses, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      Object.values(qrPollRef.current).forEach(clearInterval);
      Object.values(countdownRef.current).forEach(clearInterval);
    };
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const { account: acc, bots: myBots } = await getMe();
      setAccount(acc);
      setBots(myBots);
      if (myBots.length === 1) setSelectedBotId(myBots[0].id);
      if (myBots.length > 0) loadSettings(myBots[0].id);
    } catch (_) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  async function refreshBotStatuses() {
    if (!getToken()) return;
    try {
      const fresh = await getBots();
      setBots(fresh);
    } catch (_) {}
  }

  function loadSettings(botId: string) {
    getBotSettings(botId).then(s => setSettings(s)).catch(() => {});
  }

  function stopQRPoll(botId: string) {
    if (qrPollRef.current[botId]) {
      clearInterval(qrPollRef.current[botId]);
      delete qrPollRef.current[botId];
    }
  }

  function startQRPoll(botId: string) {
    stopQRPoll(botId);
    qrPollRef.current[botId] = setInterval(async () => {
      try {
        const { qr } = await getQR(botId);
        setQrImage(prev => ({ ...prev, [botId]: qr }));
      } catch (_) {}
    }, 2000);
  }

  function startCountdown(botId: string, seconds: number) {
    setPairingCountdown(prev => ({ ...prev, [botId]: seconds }));
    if (countdownRef.current[botId]) clearInterval(countdownRef.current[botId]);
    countdownRef.current[botId] = setInterval(() => {
      setPairingCountdown(prev => {
        const next = (prev[botId] ?? 0) - 1;
        if (next <= 0) {
          clearInterval(countdownRef.current[botId]);
          delete countdownRef.current[botId];
          return { ...prev, [botId]: 0 };
        }
        return { ...prev, [botId]: next };
      });
    }, 1000);
  }

  async function handleAddBot() {
    setAddError("");
    if (!newBotName.trim()) { setAddError("Bot name is required"); return; }
    setLinkLoading(prev => ({ ...prev, _add: true }));
    try {
      const bot = await createBot(newBotName.trim());
      setBots(prev => [...prev, { ...bot, connected: false, hasQR: false }]);
      setNewBotName("");
      setAddingBot(false);
      if (!selectedBotId) setSelectedBotId(bot.id);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setLinkLoading(prev => ({ ...prev, _add: false }));
    }
  }

  async function handleDeleteBot(botId: string) {
    try {
      await deleteBot(botId);
      setBots(prev => prev.filter(b => b.id !== botId));
      setDeleteConfirm(prev => ({ ...prev, [botId]: false }));
      stopQRPoll(botId);
      if (selectedBotId === botId) setSelectedBotId(null);
      if (settings && selectedBotId === botId) setSettings(null);
    } catch (_) {}
  }

  async function handleRenameBot(botId: string) {
    const name = renameName[botId]?.trim();
    if (!name) return;
    try {
      await renameBot(botId, name);
      setBots(prev => prev.map(b => b.id === botId ? { ...b, name } : b));
      setRenaming(prev => ({ ...prev, [botId]: false }));
      setRenameName(prev => ({ ...prev, [botId]: "" }));
    } catch (_) {}
  }

  async function handleStartQR(botId: string) {
    setLinkError(prev => ({ ...prev, [botId]: "" }));
    setLinkLoading(prev => ({ ...prev, [botId]: true }));
    try {
      await startQR(botId);
      setLinkMode(prev => ({ ...prev, [botId]: "qr" }));
      setQrImage(prev => ({ ...prev, [botId]: null }));
      startQRPoll(botId);
    } catch (err) {
      setLinkError(prev => ({ ...prev, [botId]: err instanceof Error ? err.message : "Failed to start QR" }));
    } finally {
      setLinkLoading(prev => ({ ...prev, [botId]: false }));
    }
  }

  async function handleStartPair(botId: string) {
    const phone = pairingPhone[botId]?.trim() || "";
    if (!phone) { setLinkError(prev => ({ ...prev, [botId]: "Enter phone number with country code" })); return; }
    const clean = phone.replace(/[^0-9]/g, "");
    if (clean.length < 7) { setLinkError(prev => ({ ...prev, [botId]: "Invalid phone number" })); return; }
    setLinkError(prev => ({ ...prev, [botId]: "" }));
    setLinkLoading(prev => ({ ...prev, [botId]: true }));
    try {
      const { code } = await startPairing(botId, clean);
      setPairingCode(prev => ({ ...prev, [botId]: code }));
      setLinkMode(prev => ({ ...prev, [botId]: "pair" }));
      startCountdown(botId, 180);
    } catch (err) {
      setLinkError(prev => ({ ...prev, [botId]: err instanceof Error ? err.message : "Failed to pair" }));
    } finally {
      setLinkLoading(prev => ({ ...prev, [botId]: false }));
    }
  }

  async function handleDisconnect(botId: string) {
    try {
      await disconnectBot(botId);
      setBots(prev => prev.map(b => b.id === botId ? { ...b, connected: false, status: "paused" } : b));
      setLinkMode(prev => ({ ...prev, [botId]: null }));
    } catch (_) {}
  }

  async function handleSettingsToggle(key: string, value: boolean) {
    if (!selectedBotId) return;
    setSavingKey(key);
    try {
      const updated = await updateBotSettings(selectedBotId, { [key]: value });
      setSettings(updated);
    } catch (_) {} finally { setSavingKey(null); }
  }

  async function handleSettingsText(key: string, value: string) {
    if (!selectedBotId) return;
    setSavingKey(key);
    try {
      const updated = await updateBotSettings(selectedBotId, { [key]: value });
      setSettings(updated);
      setSettingsMsg("Settings saved!");
      setTimeout(() => setSettingsMsg(""), 2500);
    } catch (_) {} finally { setSavingKey(null); }
  }

  function logout() {
    clearToken();
    navigate("/login");
  }

  const C = { bg: "#080d1a", card: "#0d1a2e", border: "#1e3a5f", text: "#e2e8f0", muted: "#64748b", accent: "#00d4ff", purple: "#a855f7" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.muted, fontSize: "1rem" }}>Loading...</div>
      </div>
    );
  }

  const canAddBot = bots.length < 2;
  const settingsBot = selectedBotId ? bots.find(b => b.id === selectedBotId) : (bots.length === 1 ? bots[0] : null);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,13,26,0.96)", backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 1.5rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 60, gap: "1rem"
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.4rem", padding: 0, flexShrink: 0
        }}>
          <span style={{ fontSize: "1.25rem" }}>⚡</span>
          <span style={{
            fontWeight: 900, fontSize: "1.05rem",
            background: "linear-gradient(135deg, #00d4ff, #a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>NUTTER-XMD</span>
        </button>

        <div style={{ display: "flex", gap: "0.2rem", background: "rgba(30,58,95,0.3)", borderRadius: "0.75rem", padding: "0.25rem" }}>
          {(["bots", "settings"] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => {
              setActiveTab(tab);
              if (tab === "settings" && (settingsBot || bots[0])) {
                const bid = settingsBot?.id || bots[0]?.id;
                if (bid) { setSelectedBotId(bid); loadSettings(bid); }
              }
            }} style={{
              padding: "0.4rem 1.1rem", borderRadius: "0.55rem", border: "none",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              background: activeTab === tab ? "linear-gradient(135deg, rgba(0,212,255,0.18), rgba(168,85,247,0.18))" : "transparent",
              color: activeTab === tab ? C.text : C.muted,
              transition: "all 0.2s"
            }}>
              {tab === "bots" ? "🤖 My Bots" : "⚙️ Settings"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {account && (
            <div style={{ display: "none" }}>
              <span style={{ color: C.muted, fontSize: "0.8rem" }}>@{account.username}</span>
            </div>
          )}
          <div style={{ color: C.muted, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ color: "#a855f7", fontWeight: 600 }}>@{account?.username}</span>
          </div>
          <button onClick={logout} style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
            color: "#fca5a5", borderRadius: "0.5rem", padding: "0.35rem 0.875rem",
            cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
          }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem" }}>

        {activeTab === "bots" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: C.text }}>My Bots</h2>
                <p style={{ margin: "0.2rem 0 0", color: C.muted, fontSize: "0.82rem" }}>
                  {bots.length}/2 bots linked to your account
                </p>
              </div>
              {canAddBot && !addingBot && (
                <button onClick={() => setAddingBot(true)} style={{
                  background: "linear-gradient(135deg, #00d4ff, #a855f7)", color: "white",
                  border: "none", borderRadius: "0.75rem", padding: "0.6rem 1.5rem",
                  cursor: "pointer", fontWeight: 700, fontSize: "0.9rem"
                }}>+ Add Bot</button>
              )}
            </div>

            {addingBot && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h3 style={{ color: C.accent, fontWeight: 800, fontSize: "1rem", margin: "0 0 1rem" }}>➕ New Bot</h3>
                {addError && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", padding: "0.6rem 1rem", color: "#fca5a5", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{addError}</div>}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <input
                    type="text" placeholder="Bot name (e.g. My WhatsApp Bot)"
                    value={newBotName} onChange={e => setNewBotName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddBot()}
                    style={{ flex: "1 1 200px", background: "#0a1628", border: `1px solid ${C.border}`, color: C.text, borderRadius: "0.75rem", padding: "0.75rem 1rem", fontSize: "0.95rem", outline: "none" }}
                  />
                  <button onClick={handleAddBot} disabled={linkLoading["_add"]} style={{
                    background: linkLoading["_add"] ? C.border : "linear-gradient(135deg, #00d4ff, #a855f7)",
                    color: "white", border: "none", borderRadius: "0.75rem", padding: "0.75rem 1.5rem",
                    cursor: "pointer", fontWeight: 700
                  }}>{linkLoading["_add"] ? "Creating..." : "Create"}</button>
                  <button onClick={() => { setAddingBot(false); setNewBotName(""); setAddError(""); }} style={{
                    background: "rgba(71,85,105,0.15)", border: `1px solid ${C.border}`,
                    color: C.muted, borderRadius: "0.75rem", padding: "0.75rem 1rem",
                    cursor: "pointer", fontSize: "0.875rem"
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {bots.length === 0 && !addingBot && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "1rem", padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🤖</div>
                <h3 style={{ color: C.text, fontWeight: 700, marginBottom: "0.5rem" }}>No bots yet</h3>
                <p style={{ color: C.muted, fontSize: "0.875rem", marginBottom: "1.5rem" }}>Add your first WhatsApp bot to get started.</p>
                <button onClick={() => setAddingBot(true)} style={{
                  background: "linear-gradient(135deg, #00d4ff, #a855f7)", color: "white",
                  border: "none", borderRadius: "0.75rem", padding: "0.7rem 2rem",
                  cursor: "pointer", fontWeight: 700
                }}>+ Add Your First Bot</button>
              </div>
            )}

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))" }}>
              {bots.map(bot => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  linkMode={linkMode[bot.id] ?? null}
                  pairingPhone={pairingPhone[bot.id] ?? ""}
                  pairingCode={pairingCode[bot.id] ?? null}
                  pairingCountdown={pairingCountdown[bot.id] ?? 0}
                  qrImage={qrImage[bot.id] ?? null}
                  isLoading={linkLoading[bot.id] ?? false}
                  error={linkError[bot.id] ?? ""}
                  renaming={renaming[bot.id] ?? false}
                  renameName={renameName[bot.id] ?? bot.name}
                  deleteConfirm={deleteConfirm[bot.id] ?? false}
                  onSetLinkMode={mode => setLinkMode(prev => ({ ...prev, [bot.id]: mode }))}
                  onSetPhone={v => setPairingPhone(prev => ({ ...prev, [bot.id]: v }))}
                  onStartQR={() => handleStartQR(bot.id)}
                  onStartPair={() => handleStartPair(bot.id)}
                  onDisconnect={() => handleDisconnect(bot.id)}
                  onDelete={() => handleDeleteBot(bot.id)}
                  onCancelLink={() => {
                    setLinkMode(prev => ({ ...prev, [bot.id]: null }));
                    setPairingCode(prev => ({ ...prev, [bot.id]: null }));
                    setQrImage(prev => ({ ...prev, [bot.id]: null }));
                    stopQRPoll(bot.id);
                  }}
                  onRenameToggle={() => setRenaming(prev => ({ ...prev, [bot.id]: !prev[bot.id] }))}
                  onRenameChange={v => setRenameName(prev => ({ ...prev, [bot.id]: v }))}
                  onRenameSubmit={() => handleRenameBot(bot.id)}
                  onDeleteConfirmToggle={() => setDeleteConfirm(prev => ({ ...prev, [bot.id]: !prev[bot.id] }))}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            {bots.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "1rem", padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚙️</div>
                <p style={{ color: C.muted }}>Add a bot first to configure settings.</p>
                <button onClick={() => setActiveTab("bots")} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", marginTop: "0.5rem" }}>Go to My Bots →</button>
              </div>
            ) : (
              <>
                {bots.length === 2 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p style={{ color: C.muted, fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Select bot to configure</p>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                      {bots.map(b => (
                        <button key={b.id} onClick={() => { setSelectedBotId(b.id); loadSettings(b.id); }} style={{
                          background: selectedBotId === b.id ? "linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.12))" : C.card,
                          border: selectedBotId === b.id ? "1px solid rgba(0,212,255,0.35)" : `1px solid ${C.border}`,
                          borderRadius: "0.75rem", padding: "0.6rem 1.25rem", cursor: "pointer",
                          color: selectedBotId === b.id ? C.text : C.muted,
                          fontWeight: 700, fontSize: "0.875rem",
                          display: "flex", alignItems: "center", gap: "0.5rem"
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.connected ? "#22c55e" : "#64748b", display: "inline-block" }} />
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {settingsMsg && (
                  <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.75rem", padding: "0.7rem 1rem", color: "#86efac", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                    ✅ {settingsMsg}
                  </div>
                )}

                {!settings ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: C.muted }}>Loading settings...</div>
                ) : (
                  <>
                    {(["Protection", "Automation", "Groups"] as const).map(group => {
                      const features = TOGGLE_FEATURES.filter(f => f.group === group);
                      return (
                        <div key={group} style={{ marginBottom: "1.5rem" }}>
                          <h3 style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                            {group === "Protection" ? "🛡️" : group === "Automation" ? "⚡" : "👥"} {group}
                          </h3>
                          <div style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                            {features.map(feat => {
                              const val = settings[feat.key] as boolean ?? false;
                              return (
                                <div key={feat.key} style={{
                                  background: C.card, border: `1px solid ${C.border}`,
                                  borderRadius: "0.875rem", padding: "0.9rem 1rem",
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  opacity: savingKey === feat.key ? 0.6 : 1, transition: "opacity 0.2s"
                                }}>
                                  <div>
                                    <div style={{ fontWeight: 600, color: C.text, fontSize: "0.875rem" }}>{feat.icon} {feat.label}</div>
                                    <div style={{ color: C.muted, fontSize: "0.75rem", marginTop: "0.1rem" }}>{feat.desc}</div>
                                  </div>
                                  <div
                                    onClick={() => !savingKey && handleSettingsToggle(feat.key, !val)}
                                    style={{
                                      width: 44, height: 24, borderRadius: 24, flexShrink: 0,
                                      background: val ? "linear-gradient(135deg, #00d4ff, #a855f7)" : C.border,
                                      position: "relative", cursor: "pointer", transition: "background 0.3s", marginLeft: "0.75rem"
                                    }}
                                  >
                                    <div style={{
                                      position: "absolute", width: 16, height: 16, borderRadius: "50%",
                                      backgroundColor: "white", top: 4, left: val ? 24 : 4,
                                      transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                                    }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "1rem", padding: "1.75rem" }}>
                      <h3 style={{ color: C.accent, fontWeight: 800, fontSize: "1rem", marginBottom: "1.25rem" }}>⚙️ Advanced Settings</h3>
                      <div style={{ display: "grid", gap: "1rem" }}>
                        {[
                          { key: "prefix", label: "🔑 Command Prefix", placeholder: ".", hint: "Character to trigger commands (default: .)", multi: false, max: 3 },
                          { key: "mode", label: "🌐 Bot Mode", placeholder: "private", hint: "private = owner only; public = anyone", multi: false },
                          { key: "anticallMsg", label: "📵 Anti-Call Message", placeholder: "Calls not allowed...", multi: true },
                          { key: "welcomeMsg", label: "👋 Welcome Message", placeholder: "Welcome {user} to {group}!", multi: true, hint: "Use {user} and {group}" },
                          { key: "goodbyeMsg", label: "💫 Goodbye Message", placeholder: "Goodbye {user}!", multi: true, hint: "Use {user} and {group}" },
                          { key: "likeEmojis", label: "❤️ Status React Emojis", placeholder: "🔥 💯 ✨ 🎉 👍", hint: "Space-separated emojis" },
                        ].map(f => (
                          <SettingField
                            key={f.key} label={f.label} placeholder={f.placeholder}
                            value={String(settings[f.key] ?? f.placeholder ?? "")}
                            onSave={v => handleSettingsText(f.key, v)}
                            saving={savingKey === f.key}
                            multiline={f.multi} hint={f.hint} maxLength={f.max}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <footer style={{ textAlign: "center", padding: "2rem", color: "#334155", fontSize: "0.78rem", borderTop: `1px solid ${C.border}`, marginTop: "3rem" }}>
        <a href="https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15" target="_blank" rel="noreferrer" style={{ color: "#25D166", textDecoration: "none" }}>Community Group</a>
        <span> · </span>
        <a href="https://whatsapp.com/channel/0029VbCcIrFEAKWNxpi8qR2V" target="_blank" rel="noreferrer" style={{ color: "#00d4ff", textDecoration: "none" }}>Official Channel</a>
        <span> · ⚡ NUTTER-XMD V.9.1.3</span>
      </footer>
    </div>
  );
}

function BotCard({
  bot, linkMode, pairingPhone, pairingCode, pairingCountdown, qrImage,
  isLoading, error, renaming, renameName, deleteConfirm,
  onSetLinkMode, onSetPhone, onStartQR, onStartPair, onDisconnect, onDelete,
  onCancelLink, onRenameToggle, onRenameChange, onRenameSubmit, onDeleteConfirmToggle
}: {
  bot: Bot; linkMode: LinkMode; pairingPhone: string; pairingCode: string | null;
  pairingCountdown: number; qrImage: string | null; isLoading: boolean; error: string;
  renaming: boolean; renameName: string; deleteConfirm: boolean;
  onSetLinkMode: (m: LinkMode) => void; onSetPhone: (v: string) => void;
  onStartQR: () => void; onStartPair: () => void; onDisconnect: () => void;
  onDelete: () => void; onCancelLink: () => void; onRenameToggle: () => void;
  onRenameChange: (v: string) => void; onRenameSubmit: () => void; onDeleteConfirmToggle: () => void;
}) {
  const C = { bg: "#080d1a", card: "#0d1a2e", border: "#1e3a5f", text: "#e2e8f0", muted: "#64748b", accent: "#00d4ff" };
  const isConnected = bot.connected;
  const fmt = pairingCode ? pairingCode.slice(0, 4) + "-" + pairingCode.slice(4) : "";
  const mins = Math.floor(pairingCountdown / 60);
  const secs = pairingCountdown % 60;

  return (
    <div style={{
      background: C.card, border: `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : C.border}`,
      borderRadius: "1.25rem", overflow: "hidden",
      boxShadow: isConnected ? "0 0 20px rgba(34,197,94,0.06)" : "none",
    }}>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "0.75rem", flexShrink: 0,
              background: isConnected ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
              border: `1px solid ${isConnected ? "rgba(34,197,94,0.25)" : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem"
            }}>🤖</div>
            <div style={{ minWidth: 0 }}>
              {renaming ? (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input
                    value={renameName} onChange={e => onRenameChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") onRenameSubmit(); if (e.key === "Escape") onRenameToggle(); }}
                    autoFocus
                    style={{
                      background: "#0a1628", border: `1px solid ${C.accent}`,
                      color: C.text, borderRadius: "0.4rem", padding: "0.25rem 0.5rem",
                      fontSize: "0.875rem", outline: "none", width: 120
                    }}
                  />
                  <button onClick={onRenameSubmit} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>✓</button>
                  <button onClick={onRenameToggle} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontWeight: 700, color: C.text, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}</span>
                  <button onClick={onRenameToggle} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.7rem", padding: "0 0.2rem" }}>✏️</button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                  backgroundColor: isConnected ? "#22c55e" : "#64748b",
                  boxShadow: isConnected ? "0 0 6px #22c55e" : "none"
                }} />
                <span style={{ color: C.muted, fontSize: "0.78rem" }}>
                  {isConnected ? `Connected · ${bot.phone ? `+${bot.phone}` : ""}` : bot.status === "suspended" ? "Suspended" : "Not connected"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            {isConnected && (
              <button onClick={onDisconnect} style={{
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                color: "#fbbf24", borderRadius: "0.5rem", padding: "0.3rem 0.7rem",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600
              }}>Disconnect</button>
            )}
            {!deleteConfirm ? (
              <button onClick={onDeleteConfirmToggle} style={{
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                color: "#fca5a5", borderRadius: "0.5rem", padding: "0.3rem 0.7rem",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600
              }}>Delete</button>
            ) : (
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button onClick={onDelete} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: "0.5rem", padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>Confirm</button>
                <button onClick={onDeleteConfirmToggle} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: "0.5rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.75rem" }}>Cancel</button>
              </div>
            )}
          </div>
        </div>

        {bot.lastSeen && (
          <p style={{ color: C.muted, fontSize: "0.75rem", margin: "0.6rem 0 0" }}>
            Last seen: {new Date(bot.lastSeen).toLocaleString()}
          </p>
        )}
      </div>

      {!isConnected && (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", padding: "0.6rem 1rem", color: "#fca5a5", fontSize: "0.82rem", marginBottom: "1rem" }}>
              ❌ {error}
            </div>
          )}

          {!linkMode && (
            <div>
              <p style={{ color: C.muted, fontSize: "0.82rem", marginBottom: "0.75rem" }}>Choose how to link this bot:</p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button onClick={() => onSetLinkMode("qr")} style={{
                  flex: "1 1 140px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)",
                  borderRadius: "0.875rem", padding: "1rem", cursor: "pointer", textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>📱</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: "0.875rem" }}>QR Code</div>
                  <div style={{ color: C.muted, fontSize: "0.75rem", marginTop: "0.2rem" }}>Scan with WhatsApp</div>
                </button>
                <button onClick={() => onSetLinkMode("pair")} style={{
                  flex: "1 1 140px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)",
                  borderRadius: "0.875rem", padding: "1rem", cursor: "pointer", textAlign: "center"
                }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>🔢</div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: "0.875rem" }}>Pairing Code</div>
                  <div style={{ color: C.muted, fontSize: "0.75rem", marginTop: "0.2rem" }}>8-digit code</div>
                </button>
              </div>
            </div>
          )}

          {linkMode === "qr" && !pairingCode && (
            <div>
              {!qrImage ? (
                <div style={{ textAlign: "center" }}>
                  <button onClick={onStartQR} disabled={isLoading} style={{
                    background: isLoading ? C.border : "linear-gradient(135deg, #00d4ff, #a855f7)",
                    color: "white", border: "none", borderRadius: "0.75rem",
                    padding: "0.75rem 2rem", cursor: isLoading ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem"
                  }}>{isLoading ? "Starting..." : "📱 Generate QR Code"}</button>
                  <p style={{ color: C.muted, fontSize: "0.8rem" }}>
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: C.muted, fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                    Scan with WhatsApp → Linked Devices → Link a Device
                  </p>
                  <div style={{ display: "inline-block", background: "white", borderRadius: "0.75rem", padding: "0.75rem" }}>
                    <img src={qrImage} alt="QR Code" style={{ width: 200, height: 200, display: "block" }} />
                  </div>
                  <p style={{ color: C.muted, fontSize: "0.75rem", marginTop: "0.5rem" }}>
                    QR refreshes automatically. Do not close this page.
                  </p>
                </div>
              )}
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button onClick={onCancelLink} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
              </div>
            </div>
          )}

          {linkMode === "pair" && !pairingCode && (
            <div>
              <p style={{ color: C.muted, fontSize: "0.82rem", marginBottom: "0.75rem" }}>Enter your WhatsApp number with country code:</p>
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <input
                  type="tel" placeholder="e.g. 2349012345678"
                  value={pairingPhone}
                  onChange={e => onSetPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onStartPair()}
                  style={{ flex: "1 1 180px", background: "#0a1628", border: `1px solid ${C.border}`, color: C.text, borderRadius: "0.75rem", padding: "0.75rem 1rem", fontSize: "0.95rem", outline: "none" }}
                />
                <button onClick={onStartPair} disabled={isLoading} style={{
                  background: isLoading ? C.border : "linear-gradient(135deg, #a855f7, #6366f1)",
                  color: "white", border: "none", borderRadius: "0.75rem", padding: "0.75rem 1.25rem",
                  cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap"
                }}>{isLoading ? "Generating..." : "🔑 Get Code"}</button>
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <button onClick={onCancelLink} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
              </div>
            </div>
          )}

          {pairingCode && (
            <div>
              <div style={{
                background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)",
                borderRadius: "1rem", padding: "1.5rem", textAlign: "center", marginBottom: "1rem"
              }}>
                <p style={{ color: C.muted, fontSize: "0.8rem", marginBottom: "0.5rem" }}>Enter this code in WhatsApp:</p>
                <div style={{ fontFamily: "monospace", fontSize: "2.5rem", fontWeight: 900, letterSpacing: "0.4rem", color: C.accent, textShadow: "0 0 20px rgba(0,212,255,0.4)", marginBottom: "0.5rem" }}>{fmt}</div>
                {pairingCountdown > 0 ? (
                  <span style={{ background: pairingCountdown < 30 ? "rgba(239,68,68,0.1)" : "rgba(0,212,255,0.08)", border: `1px solid ${pairingCountdown < 30 ? "rgba(239,68,68,0.2)" : "rgba(0,212,255,0.15)"}`, borderRadius: "100px", padding: "0.2rem 0.7rem", color: pairingCountdown < 30 ? "#fca5a5" : C.accent, fontSize: "0.78rem", fontWeight: 600 }}>
                    ⏱ {mins}:{secs.toString().padStart(2, "0")} remaining
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", fontSize: "0.78rem" }}>Expired</span>
                )}
              </div>
              <p style={{ color: C.muted, fontSize: "0.78rem", lineHeight: 1.7 }}>
                Go to WhatsApp → Settings → Linked Devices → Link a Device → Link with Phone Number
              </p>
              <button onClick={onCancelLink} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "0.8rem", marginTop: "0.5rem" }}>← Try again</button>
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div style={{ padding: "1rem 1.5rem" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>✅</span>
              <div>
                <div style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.85rem" }}>Connected</div>
                <div style={{ color: C.muted, fontSize: "0.75rem" }}>{bot.phone ? `+${bot.phone}` : "Active"}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.5rem", padding: "0.4rem 0.75rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 5px #22c55e" }} />
              <span style={{ color: "#86efac", fontSize: "0.78rem", fontWeight: 600 }}>LIVE on WhatsApp</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({
  label, placeholder, value, onSave, saving, multiline, hint, maxLength
}: {
  label: string; placeholder?: string; value: string;
  onSave: (v: string) => void; saving: boolean;
  multiline?: boolean; hint?: string; maxLength?: number;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const C = { border: "#1e3a5f", text: "#e2e8f0", muted: "#64748b" };

  const inputStyle: React.CSSProperties = {
    flex: 1, background: "#0a1628", border: `1px solid ${C.border}`,
    color: C.text, borderRadius: "0.65rem", padding: "0.7rem 0.9rem",
    fontSize: "0.875rem", outline: "none", resize: multiline ? "vertical" : "none",
    minHeight: multiline ? 72 : "auto", fontFamily: "inherit"
  };

  return (
    <div>
      <label style={{ display: "block", color: C.text, fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.4rem" }}>{label}</label>
      {hint && <p style={{ color: C.muted, fontSize: "0.75rem", margin: "0 0 0.4rem" }}>{hint}</p>}
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {multiline ? (
          <textarea value={local} onChange={e => setLocal(e.target.value)} placeholder={placeholder} style={inputStyle} />
        ) : (
          <input type="text" value={local} onChange={e => setLocal(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={{ ...inputStyle, flex: "1 1 150px" }} />
        )}
        <button
          onClick={() => onSave(local)} disabled={saving || local === value}
          style={{
            background: saving || local === value ? "#1e3a5f" : "linear-gradient(135deg, #00d4ff, #a855f7)",
            color: "white", border: "none", borderRadius: "0.65rem", padding: "0.7rem 1.1rem",
            cursor: saving || local === value ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap"
          }}
        >{saving ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
}
