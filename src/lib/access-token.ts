import crypto from "crypto";

function getTokenSecret() {
  const secret =
    process.env.INTERNAL_API_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing INTERNAL_API_SECRET for access tokens");
  }
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("base64url");
}

/** Signed access token so only the intake completer can open the snapshot. */
export function createIntakeAccessToken(
  intakeId: string,
  ttlSeconds = 60 * 60 * 24 * 14,
) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${intakeId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyIntakeAccessToken(token: string | null | undefined, intakeId: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenIntakeId, expRaw, signature] = parts;
  if (tokenIntakeId !== intakeId) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${tokenIntakeId}.${expRaw}`;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
