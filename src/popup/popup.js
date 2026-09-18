import { handleRegister, handleDerive } from "../utils/utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerBtn = document.getElementById("registerBtn");
  const deriveBtn = document.getElementById("deriveBtn");
  const statusEl = document.getElementById("status");

  registerBtn.addEventListener("click", () =>
    runAction("Registering…", async (tab) => handleRegister({ tabId: tab.id }))
  );
  deriveBtn.addEventListener("click", () =>
    runAction("Deriving hash…", async (tab) => {
      const hostname = new URL(tab.url).hostname;
      return handleDerive({ tabId: tab.id, hostname });
    })
  );

  async function runAction(waitingMsg, action) {
    registerBtn.disabled = true;
    deriveBtn.disabled = true;
    setStatus(waitingMsg);

    try {
      const tab = await getActiveTab();
      const { result, error } = await action(tab);
      setStatus(
        error ? `Failed: ${error}` : JSON.stringify(result, null, 2),
        error ? "err" : "ok"
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