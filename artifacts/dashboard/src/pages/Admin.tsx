import { useState, useEffect } from "react";
import {
  adminLogin, adminGetUsers, adminGetUserSession, adminGetUserSettings,
  adminPauseUser, adminSuspendUser, adminDeleteUser, adminDisconnectUser
} from "@/lib/api";

interface AdminUser {
  id: string;
  phone: string;
  status: string;
  sessionId: string | null;
  linkedAt: string | null;
  lastSeen: string | null;
  isFirstConnection: string;
  connected: boolean;
}

interface ConfirmAction {
  type: "pause" | "suspend" | "delete" | "disconnect";
  userId: string;
  phone: string;
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("nutter_admin_token"));
  const [username, setUsername] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetails, setUserDetails] = useState<{ session: unknown; settings: unknown } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await adminLogin(username, adminKey);
      sessionStorage.setItem("nutter_admin_token", result.token);
      setToken(result.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setLoginError(message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadUsers() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminGetUsers(token) as AdminUser[];
      setUsers(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function selectUser(user: AdminUser) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      setUserDetails(null);
      return;
    }
    setSelectedUser(user);
    setUserDetails(null);
    if (!token) return;
    setDetailsLoading(true);
    try {
      const [session, settings] = await Promise.all([
        adminGetUserSession(token, user.id),
        adminGetUserSettings(token, user.id),
      ]);
      setUserDetails({ session, settings });
    } catch (_) {
    } finally {
      setDetailsLoading(false);
    }
  }

  async function executeAction(type: ConfirmAction["type"], userId: string) {
    if (!token) return;
    try {
      if (type === "pause") await adminPauseUser(token, userId);
      if (type === "suspend") await adminSuspendUser(token, userId);
      if (type === "delete") await adminDeleteUser(token, userId);
      if (type === "disconnect") await adminDisconnectUser(token, userId);
      setSuccess(`User ${type}d successfully`);
      setTimeout(() => setSuccess(""), 3000);
      await loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setUserDetails(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Action failed";
      setError(message);
    } finally {
      setConfirmAction(null);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen cyber-grid" style={{ backgroundColor: "#080d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "#0d1a2e",
          border: "1px solid #1e3a5f",
          borderRadius: "1rem",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 0 40px rgba(168,85,247,0.15)"
        }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "3rem" }}>🔐</div>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #00d4ff, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginTop: "0.5rem"
            }}>
              Admin Panel
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              NUTTER-XMD V.9.1.3
            </p>
          </div>

          {loginError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "1rem", color: "#fca5a5", fontSize: "0.875rem" }}>
              ❌ {loginError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Username</label>
              <input
                type="text"
                placeholder="Admin username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", color: "#e2e8f0", borderRadius: "0.5rem", padding: "0.7rem 1rem" }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Admin Key</label>
              <input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", background: "#0a1628", border: "1px solid #1e3a5f", color: "#e2e8f0", borderRadius: "0.5rem", padding: "0.7rem 1rem" }}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{
                background: loginLoading ? "#334155" : "linear-gradient(135deg, #00d4ff, #a855f7)",
                color: "white", fontWeight: 700, border: "none",
                borderRadius: "0.5rem", padding: "0.875rem",
                cursor: loginLoading ? "not-allowed" : "pointer",
                fontSize: "1rem", marginTop: "0.5rem"
              }}
            >
              {loginLoading ? "⏳ Logging in..." : "🔓 Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cyber-grid" style={{ backgroundColor: "#080d1a" }}>
      <header style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(0,212,255,0.05) 100%)",
        borderBottom: "1px solid #1e3a5f",
        padding: "1.25rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h1 style={{
          fontSize: "1.5rem", fontWeight: 800,
          background: "linear-gradient(135deg, #a855f7, #00d4ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          🔐 Admin Panel
        </h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={loadUsers}
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", borderRadius: "0.4rem", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("nutter_admin_token"); setToken(null); }}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", borderRadius: "0.4rem", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#fca5a5" }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#86efac" }}>
            ✅ {success}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Users", value: users.length, icon: "👥", color: "#00d4ff" },
            { label: "Connected", value: users.filter(u => u.connected).length, icon: "🟢", color: "#22c55e" },
            { label: "Paused", value: users.filter(u => u.status === "paused").length, icon: "⏸", color: "#f59e0b" },
            { label: "Suspended", value: users.filter(u => u.status === "suspended").length, icon: "🚫", color: "#ef4444" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color, marginTop: "0.25rem" }}>{stat.value}</div>
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selectedUser ? "1fr 380px" : "1fr", gap: "1.5rem" }}>
          <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "0.75rem", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #1e3a5f" }}>
              <h2 style={{ color: "#e2e8f0", fontWeight: 700 }}>👥 All Users ({users.length})</h2>
            </div>

            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>No users yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
                      {["Phone", "Status", "Live", "Last Seen", "Actions"].map(h => (
                        <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user)}
                        style={{
                          borderBottom: "1px solid rgba(30,58,95,0.5)",
                          cursor: "pointer",
                          background: selectedUser?.id === user.id ? "rgba(0,212,255,0.04)" : "transparent",
                          transition: "background 0.1s"
                        }}
                      >
                        <td style={{ padding: "0.875rem 1rem", color: "#e2e8f0", fontWeight: 600 }}>+{user.phone}</td>
                        <td style={{ padding: "0.875rem 1rem" }}>
                          <span style={{
                            background: user.status === "active" ? "rgba(34,197,94,0.1)" : user.status === "paused" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                            color: user.status === "active" ? "#86efac" : user.status === "paused" ? "#fcd34d" : "#fca5a5",
                            border: `1px solid ${user.status === "active" ? "rgba(34,197,94,0.3)" : user.status === "paused" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                            borderRadius: "0.25rem", padding: "0.2rem 0.5rem", fontSize: "0.78rem", fontWeight: 600
                          }}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.875rem 1rem" }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                            backgroundColor: user.connected ? "#22c55e" : "#475569",
                            boxShadow: user.connected ? "0 0 6px #22c55e" : "none"
                          }} />
                          <span style={{ marginLeft: "0.4rem", color: user.connected ? "#86efac" : "#64748b", fontSize: "0.85rem" }}>
                            {user.connected ? "Yes" : "No"}
                          </span>
                        </td>
                        <td style={{ padding: "0.875rem 1rem", color: "#64748b", fontSize: "0.82rem" }}>
                          {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}
                        </td>
                        <td style={{ padding: "0.875rem 1rem" }}>
                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                            {user.connected && (
                              <ActionBtn
                                label="Disconnect"
                                color="orange"
                                onClick={e => { e.stopPropagation(); setConfirmAction({ type: "disconnect", userId: user.id, phone: user.phone }); }}
                              />
                            )}
                            {user.status !== "paused" && (
                              <ActionBtn
                                label="Pause"
                                color="yellow"
                                onClick={e => { e.stopPropagation(); setConfirmAction({ type: "pause", userId: user.id, phone: user.phone }); }}
                              />
                            )}
                            {user.status !== "suspended" && (
                              <ActionBtn
                                label="Suspend"
                                color="red"
                                onClick={e => { e.stopPropagation(); setConfirmAction({ type: "suspend", userId: user.id, phone: user.phone }); }}
                              />
                            )}
                            <ActionBtn
                              label="Delete"
                              color="darkred"
                              onClick={e => { e.stopPropagation(); setConfirmAction({ type: "delete", userId: user.id, phone: user.phone }); }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedUser && (
            <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "0.75rem", overflow: "hidden", alignSelf: "start" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #1e3a5f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ color: "#e2e8f0", fontWeight: 700 }}>+{selectedUser.phone}</h3>
                <button onClick={() => { setSelectedUser(null); setUserDetails(null); }} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>

              <div style={{ padding: "1.25rem" }}>
                <DetailRow label="User ID" value={selectedUser.id.slice(0, 12) + "..."} />
                <DetailRow label="Status" value={selectedUser.status} />
                <DetailRow label="Connected" value={selectedUser.connected ? "Yes ✅" : "No ❌"} />
                <DetailRow label="Linked At" value={selectedUser.linkedAt ? new Date(selectedUser.linkedAt).toLocaleString() : "—"} />
                <DetailRow label="Last Seen" value={selectedUser.lastSeen ? new Date(selectedUser.lastSeen).toLocaleString() : "—"} />
                <DetailRow label="First Connection" value={selectedUser.isFirstConnection === "true" ? "Yes" : "No"} />

                {detailsLoading && <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "1rem" }}>Loading details...</p>}

                {userDetails && (
                  <>
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #1e3a5f" }}>
                      <p style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem" }}>Session</p>
                      <DetailRow label="Session ID" value={
                        (userDetails.session as { sessionId?: string })?.sessionId
                          ? ((userDetails.session as { sessionId: string }).sessionId.slice(0, 16) + "...")
                          : "—"
                      } />
                    </div>

                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #1e3a5f" }}>
                      <p style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "0.5rem" }}>Settings</p>
                      {userDetails.settings && Object.entries(userDetails.settings as Record<string, unknown>)
                        .filter(([k]) => k !== "userId")
                        .map(([key, val]) => (
                          <DetailRow
                            key={key}
                            label={key}
                            value={typeof val === "boolean" ? (val ? "✅" : "❌") : String(val ?? "—")}
                          />
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#0d1a2e", border: "1px solid #1e3a5f", borderRadius: "1rem", padding: "2rem", maxWidth: "400px", width: "100%", margin: "0 1rem" }}>
            <h3 style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "0.75rem", textTransform: "capitalize" }}>
              {confirmAction.type === "delete" ? "🗑 Delete" : confirmAction.type === "suspend" ? "🚫 Suspend" : confirmAction.type === "disconnect" ? "🔌 Disconnect" : "⏸ Pause"} User
            </h3>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
              Are you sure you want to <strong>{confirmAction.type}</strong> user <strong>+{confirmAction.phone}</strong>?
              {confirmAction.type === "delete" && " This cannot be undone."}
              {confirmAction.type === "disconnect" && " The bot will be logged out from WhatsApp."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{ background: "rgba(71,85,105,0.3)", border: "1px solid #1e3a5f", color: "#94a3b8", borderRadius: "0.5rem", padding: "0.6rem 1.25rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeAction(confirmAction.type, confirmAction.userId)}
                style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", borderRadius: "0.5rem", padding: "0.6rem 1.25rem", cursor: "pointer", fontWeight: 600 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label, color, onClick
}: {
  label: string;
  color: "orange" | "yellow" | "red" | "darkred";
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const colorMap = {
    orange: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", text: "#fdba74" },
    yellow: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#fcd34d" },
    red: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", text: "#fca5a5" },
    darkred: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", text: "#ef4444" },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={onClick}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, borderRadius: "0.3rem", padding: "0.25rem 0.55rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 500 }}
    >
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid rgba(30,58,95,0.3)" }}>
      <span style={{ color: "#64748b", fontSize: "0.78rem" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: "0.78rem", fontFamily: "monospace", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
