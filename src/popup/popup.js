const registerBtn = document.getElementById("registerBtn");
const statusEl = document.getElementById("status");

// On load: if a credential already exists, reflect that instead of letting
// the user blindly create a second one.
(async function init() {
  const { credentialId, prfSupported } = await chrome.storage.local.get([
    "credentialId",
    "prfSupported",
  ]);
  if (credentialId) {
    setStatus(
      `Already registered.\ncredentialId: ${credentialId}\nPRF supported: ${prfSupported}`,
      "ok"
    );
    registerBtn.textContent = "Re-register (overwrites existing)";
  }
})();

registerBtn.addEventListener("click", async () => {
  registerBtn.disabled = true;
  setStatus("Waiting for authenticator…");

  try {
    const result = await registerMasterPasskey();
    setStatus(
      `Registered.\ncredentialId: ${result.credentialId}\nPRF supported: ${result.prfSupported}`,
      "ok"
    );
  } catch (err) {
    setStatus(`Failed: ${describeError(err)}`, "err");
  } finally {
    registerBtn.disabled = false;
  }
});

async function registerMasterPasskey() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Passkey Bridge" },
      user: { id: userId, name: "bridge-user", displayName: "Bridge User" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      hints: ["hybrid"], 
      extensions: {
        prf: {},
      },
      attestation: "none",
    },
  });

  const prfSupported = cred.getClientExtensionResults()?.prf?.enabled === true;
  const credentialId = cred.id;

  await chrome.storage.local.set({ credentialId, prfSupported });
  return { credentialId, prfSupported };
}

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

function describeError(err) {
  // Surface the common WebAuthn DOMException names with plain-language hints
  switch (err.name) {
    case "NotAllowedError":
      return "User cancelled, or the operation timed out.";
    case "InvalidStateError":
      return "A credential for this authenticator/rp may already exist.";
    case "NotSupportedError":
      return "No compatible authenticator/algorithm available.";
    case "SecurityError":
      return "Origin/RP mismatch — check this is running from the extension's own page context.";
    default:
      return `${err.name || "Error"}: ${err.message}`;
  }
}