const PASSWORD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

const HKDF_SALT = new TextEncoder().encode(
  "my-app:password-generation:v1"
);

/**
  Password Generation scheme:
  1. Derive the hash with deterministic salt
  2. Use the hash as Input to a KDF (so we can not run out of bytes)
  3. Rejection sampling: First calculate the largest clean multiple of alphabet size that fits inside the byte range. If the byte exceeds that threshold, throw it away. Otherwise calculate
    byte % N
  4. Policy Compliance: Two Options: (TODO: as strategy pattern)
    - Generate a full password, if it does not fit policy, regenerate
    - generate needed characters first (for example digits), in the end shuffle the order of all characters
 * @param {*} prfResultBuffer 
 * @param {*} length 
 * @returns 
 */
export async function generateSecret(prfResultBuffer, length = 20) {
  // 1. already happened and is stored in prfResultBuffer
  const character_set = PASSWORD_ALPHABET;
  const n = character_set.length;

  // 2. Use the hash as input to a KDF (we use HKDF)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    prfResultBuffer,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const threshold = Math.floor(256 / n) * n;

  let password = "";
  let counter = 0;

  while (password.length < length) {
    const info = new TextEncoder().encode(
      `${counter++}`
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: HKDF_SALT,
        info,
      },
      keyMaterial,
      256 // 32 bytes
    );
    const bytes = new Uint8Array(bits);
    // 3. Rejection Sampling
    for (const byte of bytes) {
      if (byte >= threshold) {
        continue;
      }
      password += character_set[byte % n];
      if (password.length === length) {
        break;
      }
    }
  }
  return password;
}