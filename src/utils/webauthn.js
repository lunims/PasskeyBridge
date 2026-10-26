/**
 * Function for registering a passkey in the name of the relying party.
 * It is supposed to be directly passed to the chrome.scripting.executeScript functionality in the page's main world.
 * 
 * @returns {Promise<
 *   { credentialId: string, prfSupported: boolean, hostname: string } |
 *   { error: string } >} -> Metadata about the new credential, or an error message on failure.
 */
export async function registerPasskeyInPage() {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: `Passkey Bridge (${location.hostname})` },
        user: {
          id: userId,
          // This is just a placeholder value for now
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

/**
 * 
 * @param {number[]} saltArray Salt bytes (dervied from hostname). 
 *  Passed as a plain array because typed arrays do not survive the
 *  executeScript argument serialization.
 * @returns {Promise<
 *   { credentialId: string, prfResult: number[] } |
 *   { error: string }
 * >} The credential ID that was used and the PRF output bytes (32 bytes for
 *   hmac-secret), or an error message on failure.
 */
export async function deriveHashInPage(saltArray) {
  try {
    const saltBuffer = new Uint8Array(saltArray).buffer;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        userVerification: "required",
        extensions: { prf: { eval: { first: saltBuffer } } },
      },
    });

    const prfResult = assertion.getClientExtensionResults()?.prf?.results?.first;
    if (!prfResult) {
      return { error: "No PRF result returned — authenticator may not support PRF" };
    }

    return {
      credentialId: assertion.id,
      prfResult: Array.from(new Uint8Array(prfResult)),
    };
  } catch (err) {
    return { error: err.message };
  }
}