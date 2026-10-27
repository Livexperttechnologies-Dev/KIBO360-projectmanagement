import crypto from "crypto";
import { env } from "../config/env";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const ALLOWED_CLOCK_DRIFT_STEPS = 2;

function encryptionKey() {
  const configured = env.TOTP_ENCRYPTION_KEY;
  if (configured && /^[0-9a-fA-F]{64}$/.test(configured)) return Buffer.from(configured, "hex");
  if (env.NODE_ENV === "production") throw new Error("TOTP_ENCRYPTION_KEY must be configured in production");
  return crypto.createHash("sha256").update("KIBO360 local-only authenticator encryption key").digest();
}

function base32Encode(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string) {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "")) {
    const digit = BASE32_ALPHABET.indexOf(character);
    if (digit < 0) throw new Error("Invalid authenticator secret");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function createTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function createOtpAuthUri(email: string, secret: string) {
  const issuer = "KIBO360";
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

export function encryptTotpSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptTotpSecret(encrypted: string) {
  const [version, ivText, tagText, ciphertextText] = encrypted.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("Invalid stored authenticator secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

function codeAtStep(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return (binary % 1_000_000).toString().padStart(6, "0");
}

export function matchingTotpStep(secret: string, code: string, now = Date.now(), lastUsedStep?: number) {
  if (!/^\d{6}$/.test(code)) return undefined;
  const currentStep = Math.floor(now / 1000 / STEP_SECONDS);
  const supplied = Buffer.from(code);
  for (let offset = -ALLOWED_CLOCK_DRIFT_STEPS; offset <= ALLOWED_CLOCK_DRIFT_STEPS; offset++) {
    const step = currentStep + offset;
    if (lastUsedStep !== undefined && step <= lastUsedStep) continue;
    const expected = Buffer.from(codeAtStep(secret, step));
    if (crypto.timingSafeEqual(supplied, expected)) return step;
  }
  return undefined;
}
