import * as crypto from "crypto";

export function randomString(length: number) {
  return crypto.randomBytes(length / 4 * 3).toString("base64")
}

export function saltedHash(secret: string, salt: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(salt)
    .digest("base64")
}

export function saltedCompare(plain: string, salt: string, hashed: string) {
  const localHash = crypto
    .createHmac('sha256', plain)
    .update(salt)
    .digest("base64")

  return localHash === hashed
}