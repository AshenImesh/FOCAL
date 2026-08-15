const TEACHA_COOKIE = "focal_teacher";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

function b64urlEncode(data: Uint8Array): string {
  let bin = "";
  data.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export type TeacherClaims = {
  v: 1;
  tid: number;
  user: string;
  exp: number;
};

export async function signTeacherToken(
  payload: Omit<TeacherClaims, "v" | "exp">
): Promise<string> {
  const claims: TeacherClaims = {
    v: 1,
    tid: payload.tid,
    user: payload.user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  };
  const secret = process.env.SESSION_SECRET || "";
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const key = await hmacKey(secret);
  const sig = b64urlEncode(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
    )
  );
  return `${body}.${sig}`;
}

export async function verifyTeacherToken(
  token: string
): Promise<TeacherClaims | null> {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;

    const claims = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body))
    ) as TeacherClaims;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function teacherCookieName(): string {
  return TEACHA_COOKIE;
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === (process.env.ADMIN_EMAIL || "").toLowerCase();
}

export async function isAdminUser(
  email: string | undefined | null
): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  if (!email) return false;
  try {
    const { adminClient } = await import("./supabase/admin");
    const { data } = await adminClient()
      .from("admins")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
