const BASE = "/api";

export async function pairBot(phone: string) {
  const res = await fetch(`${BASE}/bot/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Failed to pair");
  }
  return res.json() as Promise<{ pairingCode: string | null; userId: string; message?: string }>;
}

export async function getBotStatusByPhone(phone: string) {
  const res = await fetch(`${BASE}/bot/status-by-phone/${phone.replace(/[^0-9]/g, "")}`);
  return res.json() as Promise<{ connected: boolean; status: string; userId?: string; phone?: string; lastSeen?: string }>;
}

export async function getSettings(userId: string) {
  const res = await fetch(`${BASE}/settings/${userId}`);
  if (!res.ok) throw new Error("Settings not found");
  return res.json();
}

export async function updateSettings(userId: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/settings/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function adminLogin(username: string, adminKey: string) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, adminKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Invalid credentials");
  }
  return res.json() as Promise<{ token: string; username: string }>;
}

export async function adminGetUsers(token: string) {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: { "x-admin-token": token },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json() as Promise<any[]>;
}

export async function adminGetUserSettings(token: string, userId: string) {
  const res = await fetch(`${BASE}/admin/users/${userId}/settings`, {
    headers: { "x-admin-token": token },
  });
  return res.json();
}

export async function adminPauseUser(token: string, userId: string) {
  const res = await fetch(`${BASE}/admin/users/${userId}/pause`, {
    method: "POST",
    headers: { "x-admin-token": token },
  });
  return res.json();
}

export async function adminSuspendUser(token: string, userId: string) {
  const res = await fetch(`${BASE}/admin/users/${userId}/suspend`, {
    method: "POST",
    headers: { "x-admin-token": token },
  });
  return res.json();
}

export async function adminDeleteUser(token: string, userId: string) {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { "x-admin-token": token },
  });
  return res.json();
}
