chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REGISTER_PASSKEY" && sender.tab?.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: sender.tab.id },
        world: "MAIN",
        func: registerPasskeyInPage,
      })
      .then((results) => {
        // executeScript returns an array (one entry per frame); take the top frame's result
        const result = results[0]?.result;
        if (result?.error) {
          sendResponse({ error: result.error });
        } else {
          sendResponse({ result });
        }
      })
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep the message channel open for the async response
  }
});

// This function is injected and runs in the page's own MAIN world.
// It cannot close over any outer variables — everything it needs must
// be computed inside it or passed via executeScript's `args`.
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