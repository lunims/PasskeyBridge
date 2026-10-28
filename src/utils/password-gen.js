const uppercase = "ABCDEFGHIJKLMNOQRSTUVWXYZ";
const lowercase = "abcdefghijklmnopqrstuvwxyz";
const digits    = "0123456789";
const special   = "!@#$%^&*";

const HKDF_SALT = new TextEncoder().encode(
  "my-app:password-generation:v1"
);

function getCharacterSet(settings) {
  let character_set = "";
  if(settings.uppercase) {
    character_set += uppercase;
  }
  if(settings.lowercase) {
    character_set += lowercase;
  }
  if(settings.digits) {
    character_set += digits;
  }
  if(settings.special) {
    character_set += special;
  }
  return character_set;
}

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
export async function generateSecret(prfResultBuffer, settings) {
  console.log(settings);
  const length = settings.length;
  // 1. already happened and is stored in prfResultBuffer
  const character_set = getCharacterSet(settings);
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
    /*
    TODO: Policy compliance, check if password matches specified policy (this also needs settings in UI)
    Two approaches: Bitwarden: generate needed characters first and shuffle them into
                    1Password: Generate password, see if it matches, if not try again
    */
  }
  // TODO: Log to be removed, just for testing purposes
  console.log(password);
  return password;
}