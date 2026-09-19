import { loadSettings, saveSettings, handleRegister, handleDerive} from "../utils/utils.js";

const passwordLengthInput = document.getElementById("passwordLength");
const uppercaseCheckbox = document.getElementById("uppercase");
const lowercaseCheckbox = document.getElementById("lowercase");
const digitsCheckbox    = document.getElementById("digits");
const specialCheckbox   = document.getElementById("special");
const saveSettingsBtn   = document.getElementById("saveSettingsBtn");

let currentHostname;

document.addEventListener("DOMContentLoaded", async () => {
  await loadAndApplySettings();
  saveSettingsBtn.addEventListener("click", saveSettingsFromButton);
});

async function loadAndApplySettings() {
  const tab = await getActiveTab();  
  currentHostname = new URL(tab.url).hostname;
  const settings = await loadSettings(currentHostname);
  applySettingsToForm(settings);
}

async function saveSettingsFromButton() {
    const settings = readSettingsFromForm();
    await saveSettings(settings, currentHostname);
}

function readSettingsFromForm() {
  return {
    length: Number(passwordLengthInput.value),
    uppercase: uppercaseCheckbox.checked,
    lowercase: lowercaseCheckbox.checked,
    digits: digitsCheckbox.checked,
    special: specialCheckbox.checked,
  };
}

function applySettingsToForm(settings) {
  passwordLengthInput.value = settings.length;
  uppercaseCheckbox.checked = settings.uppercase;
  lowercaseCheckbox.checked = settings.lowercase;
  digitsCheckbox.checked = settings.digits;
  specialCheckbox.checked = settings.special;
}

const registerBtn = document.getElementById("registerBtn");
const deriveBtn = document.getElementById("deriveBtn");
const statusEl = document.getElementById("status");

registerBtn.addEventListener("click", () =>
  runAction("Registering Passkey…", async (tab) =>
    handleRegister({ tabId: tab.id })
  )
);

deriveBtn.addEventListener("click", () =>
  runAction("Deriving Password…", async (tab) => {
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

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return tab;
}