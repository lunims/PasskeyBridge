import { deriveHashInPage } from "./webauthn.js";
import { generateSecret } from "./password-gen.js";

/**
 * Dervies a deterministic 32-byte salt from a hostname.
 * 
 * @param {string} hostname - hostname of the website to derive the salt
 * @returns {Promise<ArrayBuffer>} SHA-256 digest of the hostname.
 */
export async function hostnameToSalt(hostname) {
  const enc = new TextEncoder().encode(`${hostname}`);
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
 * Wrapper function to orchestrate the password generation sequence
 * First: calls the Passkey PRF extension inside the page's main world via inject() 
 *  with the hostname and retrieves the hash value via deriveHash() of webauthn.js.
 * Then: calls generateSecret() of password-gen.js to actually generate the password.
 * 
 * 
 * @param {Object} params 
 * @param {int} params.tabId - ID of the browser tab whose page context to run in
 * @param {string} params.hostname - Hostname of the site to derive a password for
 * @returns 
 */
export async function handleDerive({ tabId, hostname }) {
  const saltBuffer = await hostnameToSalt(hostname);
  const saltArray = Array.from(new Uint8Array(saltBuffer));

  const { result, error } = await inject(tabId, deriveHashInPage, [saltArray]);
  if (error) return { error };

  const prfBuffer = new Uint8Array(result.prfResult).buffer;
  const password = await generateSecret(prfBuffer);

  return {
    result: {
      hostname,
      credentialId: result.credentialId,
      password: password,
    },
  };
}


/**
 * Wrapper function to orchestrate Passkey registration sequence
 * - Calls registerPasskey() from webauthn.js and executes inside the pages main world via inject
 * 
 * @param {Object} params - Function parameters.
 * @param {number} params.tabId - ID of the browser tab whose page context to run the registration sequence in.
 * @returns {Promise<{result?: any, error?: string}>} The result of the Passkey registration, 
 *      or an error message if execution fails.
 */
export async function handleRegister({ tabId }) {
  const { registerPasskeyInPage } = await import("./webauthn.js");
  return inject(tabId, registerPasskeyInPage);
}