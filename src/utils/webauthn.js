// These functions are passed directly to chrome.scripting.executeScript's
// `func` option and re-serialized into the target page's MAIN world.
// They cannot close over anything outside themselves. Any arguments passed
// in via `args`, and any values returned out, must be plain
// JSON-serializable data — raw ArrayBuffers are NOT reliably serializable
// across this specific boundary, so they're converted to plain arrays
// on both sides.

export async function registerPasskeyInPage() {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: `Passkey Bridge (${location.hostname})` },
        user: {
          id: userId,
          name: `bridge@${location.hostname}`,
          displayName: `Passkey Bridge — ${location.hostname}`,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        extensions: { prf: {} },
        attestation: "none",
      },
    });

    return {
      credentialId: cred.id,
      prfSupported: cred.getClientExtensionResults()?.prf?.enabled === true,
      hostname: location.hostname,
    };
  } catch (err) {
    return { error: err.message };
  }
}

// saltArray: plain array of bytes (NOT an ArrayBuffer — see note above)
export async function deriveHashInPage(saltArray) {
  try {
    const saltBuffer = new Uint8Array(saltArray).buffer;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        userVerification: "required",
        extensions: { prf: { eval: { first: saltBuffer } } },
      },
    });

    const prfResult = assertion.getClientExtensionResults()?.prf?.results?.first;
    if (!prfResult) {
      return { error: "No PRF result returned — authenticator may not support PRF" };
    }

    return {
      credentialId: assertion.id,
      prfResult: Array.from(new Uint8Array(prfResult)),
    };
  } catch (err) {
    return { error: err.message };
  }
}