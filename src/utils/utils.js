import { deriveHashInPage, registerPasskeyInPage } from "./webauthn.js";
import { generateSecret } from "./password-gen.js";

/**
 * Derives a deterministic 32-byte salt from a hostname.
 *
 * @param {string} hostname - hostname of the website to derive the salt
 * @returns {Promise<ArrayBuffer>} SHA-256 digest of the hostname.
 */
export async function hostnameToSalt(hostname) {
  const enc = new TextEncoder().encode(`passkey-bridge:v1:${hostname}`);
  return crypto.subtle.digest("SHA-256", enc);
}

/**
 * Executes a function in the page's main world
 *
 * @param {int} tabId - ID of the browser tab whose page context to run in
 * @param {Function} func - Function to be executed in the page's main world
 * @param {Array} args - Arguments to pass to the function
 * @returns {Promise<{result?: any, error?: string}>} - An object containing the function result or an error
 *      message if execution failed
 */
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

/**
 * Wrapper function to orchestrate the password generation sequence.
 * First: calls the Passkey PRF extension inside the page's main world via
 * inject() with a hostname-derived salt and retrieves the raw PRF result
 * via deriveHashInPage() from webauthn.js.
 * Then: calls encodeSecret() from password-gen.js to generate the password.
 *
 * @param {Object} params
 * @param {int} params.tabId - ID of the browser tab whose page context to run in
 * @param {string} params.hostname - Hostname of the site to derive a password for
 * @returns {Promise<{result?: any, error?: string}>}
 */
export async function handleDerive({ tabId, hostname }) {
  const saltBuffer = await hostnameToSalt(hostname);
  const saltArray = Array.from(new Uint8Array(saltBuffer));

  const { result, error } = await inject(tabId, deriveHashInPage, [saltArray]);
  if (error) return { error };

  const settings = await loadSettings(hostname);
  const prfBuffer = new Uint8Array(result.prfResult).buffer;
  const password = await generateSecret(prfBuffer, settings);

  return {
    result: {
      hostname,
      credentialId: result.credentialId,
      password,
    },
  };
}

/**
 * Wrapper function to orchestrate Passkey registration sequence
 * - Calls registerPasskeyInPage() from webauthn.js and executes it
 *   inside the page's main world via inject().
 *
 * @param {Object} params - Function parameters.
 * @param {number} params.tabId - ID of the browser tab whose page context to run the registration sequence in.
 * @returns {Promise<{result?: any, error?: string}>} The result of the Passkey registration,
 *      or an error message if execution fails.
 */
export async function handleRegister({ tabId }) {
  return inject(tabId, registerPasskeyInPage);
}

const DEFAULT_SETTINGS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  digits: true,
  special: true,
};

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return tab;
}

/**
 * Loads the stored settings for a given hostname. If no settings are specified for this hostname, default settings are returned.
 * 
 * @param {String} hostname - hostname to load settings from.
 * @returns {Promise<object>} - The stored settings, or DEFAULT_SETTINGS if none exist.
 */
export async function loadSettings(hostname) {
  const key = `siteSettings:${hostname}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] ?? DEFAULT_SETTINGS;
}

/**
 * Saves a given set of settings for a specific hostname in the browser storage.
 * 
 * @param {Object} settings - settings object which should be save.
 * @param {*} hostname - hostname which the settings should be saved for.
 */
export async function saveSettings(settings, hostname) {
  const key = `siteSettings:${hostname}`;
  await chrome.storage.local.set({ [key]: settings });
}