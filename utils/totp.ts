/**
 * Base32 decoding helper to convert secret string into byte array.
 */
export function base32ToBytes(base32: string): Uint8Array {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  const len = cleaned.length;
  const bytes = new Uint8Array(Math.floor((len * 5) / 8));

  let keep = 0;
  let keepLen = 0;
  let byteIdx = 0;

  for (let i = 0; i < len; i++) {
    const val = base32chars.indexOf(cleaned[i]);
    if (val === -1) continue; // Skip invalid characters

    keep = (keep << 5) | val;
    keepLen += 5;

    if (keepLen >= 8) {
      bytes[byteIdx++] = (keep >> (keepLen - 8)) & 255;
      keepLen -= 8;
    }
  }
  return bytes;
}

/**
 * Generates the current 6-digit TOTP code and the time left for the given Base32 secret key.
 * Uses Web Crypto API.
 */
export async function generateTOTP(secret: string): Promise<{ code: string; timeLeft: number }> {
  try {
    // 1. Base32 decode the secret key
    const keyBytes = base32ToBytes(secret);
    if (keyBytes.length === 0) return { code: "Invalid Key", timeLeft: 0 };

    // 2. Calculate time step
    const epoch = Math.round(new Date().getTime() / 1000);
    const timeStep = 30;
    const counter = Math.floor(epoch / timeStep);
    const timeLeft = timeStep - (epoch % timeStep);

    // 3. Convert counter to 8-byte array
    const counterBytes = new Uint8Array(8);
    let temp = counter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = temp & 255;
      temp = Math.floor(temp / 256);
    }

    // 4. Import key to Web Crypto
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes as any,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );

    // 5. Sign counter bytes
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      counterBytes as any
    );

    // 6. Truncate hash
    const hmacResult = new Uint8Array(signature);
    const offset = hmacResult[hmacResult.length - 1] & 15;
    const binary =
      ((hmacResult[offset] & 127) << 24) |
      ((hmacResult[offset + 1] & 255) << 16) |
      ((hmacResult[offset + 2] & 255) << 8) |
      (hmacResult[offset + 3] & 255);

    // 7. Get 6 digit code
    const otp = binary % 1000000;
    const code = otp.toString().padStart(6, "0");

    return { code, timeLeft };
  } catch (error) {
    console.error("Error generating TOTP:", error);
    return { code: "Error", timeLeft: 0 };
  }
}
