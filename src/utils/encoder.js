export async function hostnameToSalt(hostname) {
  const enc = new TextEncoder().encode(`passkey-bridge:v1:${hostname}`);
  return crypto.subtle.digest("SHA-256", enc);
}

export async function encodeSecret(prfResultBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", prfResultBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}