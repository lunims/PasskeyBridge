import { registerPasskeyInPage, deriveHashInPage } from "../utils/webauthn.js";
import { hostnameToSalt, encodeSecret } from "../utils/encoder.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerBtn = document.getElementById("registerBtn");
  const deriveBtn = document.getElementById("deriveBtn");
  const statusEl = document.getElementById("status");

  registerBtn.addEventListener("click", handleRegister);
  deriveBtn.addEventListener("click", handleDerive);

  async function handleRegister() {
    await withButtons("Registering…", async () => {
      const tab = await getActiveTab();
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: registerPasskeyInPage,
      });
      return result;
    });
  }

  async function handleDerive() {
    await withButtons("Deriving hash…", async () => {
      const tab = await getActiveTab();
      const hostname = new URL(tab.url).hostname;
      const saltBuffer = await hostnameToSalt(hostname);
      const saltArray = Array.from(new Uint8Array(saltBuffer));

      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: deriveHashInPage,
        args: [saltArray],
      });

      if (result?.error) return result;

      const prfBuffer = new Uint8Array(result.prfResult).buffer;
      const hash = await encodeSecret(prfBuffer);
      return { hostname, credentialId: result.credentialId, hash };
    });
  }

  async function withButtons(waitingMsg, action) {
    registerBtn.disabled = true;
    deriveBtn.disabled = true;
    setStatus(waitingMsg);
    try {
      const result = await action();
      setStatus(
        result?.error ? `Failed: ${result.error}` : JSON.stringify(result, null, 2),
        result?.error ? "err" : "ok"
      );
    } catch (err) {
      setStatus(`Failed: ${err.message}`, "err");
    } finally {
      registerBtn.disabled = false;
      deriveBtn.disabled = false;
    }
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found");
    return tab;
  }

  function setStatus(msg, cls = "") {
    statusEl.textContent = msg;
    statusEl.className = cls;
  }
});