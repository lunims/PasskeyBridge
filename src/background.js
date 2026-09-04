import { registerPasskeyInPage, deriveHashInPage } from "./utils/webauthn.js";
import { hostnameToSalt, encodeSecret } from "./utils/encoder.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab?.id) return;

  if (msg.type === "REGISTER_PASSKEY") {
    inject(sender.tab.id, registerPasskeyInPage).then(sendResponse);
    return true;
  }

  if (msg.type === "DERIVE_HASH") {
    handleDerive(sender.tab).then(sendResponse);
    return true;
  }
});

async function inject(tabId, func, args = []) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func,
      args,
    });
    return result?.error ? { error: result.error } : { result };
  } catch (err) {
    return { error: err.message };
  }
}

async function handleDerive(tab) {
  const hostname = new URL(tab.url).hostname;
  const saltBuffer = await hostnameToSalt(hostname);

  const { result, error } = await inject(tab.id, deriveHashInPage, [saltBuffer]);
  if (error) return { error };

  const prfBuffer = new Uint8Array(result.prfResult).buffer;
  const hash = await encodeSecret(prfBuffer);
  return { result: { hostname, credentialId: result.credentialId, hash } };
}