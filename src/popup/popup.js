document.addEventListener("DOMContentLoaded", () => {
  const registerBtn = document.getElementById("registerBtn");
  const deriveBtn = document.getElementById("deriveBtn");
  const statusEl = document.getElementById("status");

  registerBtn.addEventListener("click", () => runInPage(registerPasskeyInPage, "Registering…"));
  deriveBtn.addEventListener("click", () => runInPage(deriveHashInPage, "Deriving hash…"));

  async function runInPage(fn, waitingMsg) {
    registerBtn.disabled = true;
    deriveBtn.disabled = true;
    setStatus(waitingMsg);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: fn,
      });

      if (result?.error) {
        setStatus(`Failed: ${result.error}`, "err");
      } else {
        setStatus(JSON.stringify(result, null, 2), "ok");
      }
    } catch (err) {
      setStatus(`Failed: ${err.message}`, "err");
    } finally {
      registerBtn.disabled = false;
      deriveBtn.disabled = false;
    }
  }

  function setStatus(msg, cls = "") {
    statusEl.textContent = msg;
    statusEl.className = cls;
  }
});

// --- Injected into the page's MAIN world. No closures over outer scope. ---

async function registerPasskeyInPage() {
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
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
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

async function deriveHashInPage() {
  try {
    const hostname = location.hostname;

    // Deterministic per-site salt for the PRF eval, derived from the hostname.
    const enc = new TextEncoder().encode(`passkey-bridge:v1:${hostname}`);
    const saltBuffer = await crypto.subtle.digest("SHA-256", enc);

    // No allowCredentials — relies on a discoverable/resident credential
    // for this rp being available (e.g. picked from Bitwarden's UI).
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        userVerification: "required",
        extensions: {
          prf: { eval: { first: saltBuffer } },
        },
      },
    });

    const prfResult = assertion.getClientExtensionResults()?.prf?.results?.first;
    if (!prfResult) {
      return { error: "No PRF result returned — authenticator may not support PRF" };
    }

    // Combine PRF output with hostname context and hash to produce
    // the final site-specific secret (SHA-256 hex string for now).
    const combined = new Uint8Array(prfResult.byteLength + enc.byteLength);
    combined.set(new Uint8Array(prfResult), 0);
    combined.set(enc, prfResult.byteLength);

    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return { hostname, credentialId: assertion.id, hash: hashHex };
  } catch (err) {
    return { error: err.message };
  }
}