import { handleRegister, handleDerive } from "./utils/utils.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender.tab?.id) return;

  if (msg.type === "REGISTER_PASSKEY") {
    handleRegister({ tabId: sender.tab.id }).then(sendResponse);
    return true;
  }

  if (msg.type === "DERIVE_HASH") {
    const hostname = new URL(sender.tab.url).hostname;
    handleDerive({ tabId: sender.tab.id, hostname }).then(sendResponse);
    return true;
  }
});