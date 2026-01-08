/**
 * Encryption Utility for Sensitive Data
 *
 * Provides AES-256-CBC encryption for storing sensitive data like OAuth tokens.
 *
 * IMPORTANT: In production, use a proper key management service (KMS) like:
 * - AWS KMS
 * - Google Cloud KMS
 * - Azure Key Vault
 * - HashiCorp Vault
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: 32-character (256-bit) encryption key
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If ENCRYPTION_KEY is not set, falls back to NEXTAUTH_SECRET (not recommended for production)
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Get the encryption key from environment
 * Validates key length and provides clear error messages
 */
function getEncryptionKey(): Buffer {
  // Prefer dedicated encryption key
  let keySource = process.env.ENCRYPTION_KEY

  if (!keySource) {
    // Fallback to NEXTAUTH_SECRET with warning
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[SECURITY WARNING] ENCRYPTION_KEY not set. Using NEXTAUTH_SECRET as fallback. ' +
        'Set a dedicated ENCRYPTION_KEY for production security.'
      )
    }
    keySource = process.env.NEXTAUTH_SECRET
  }

  if (!keySource) {
    throw new Error(
      'No encryption key available. Set ENCRYPTION_KEY or NEXTAUTH_SECRET environment variable.'
    )
  }

  // If key is hex-encoded (64 chars), decode it
  if (keySource.length === 64 && /^[0-9a-fA-F]+$/.test(keySource)) {
    return Buffer.from(keySource, 'hex')
  }

  // If key is exactly 32 bytes, use directly
  if (keySource.length === KEY_LENGTH) {
    return Buffer.from(keySource, 'utf8')
  }

  // Hash the key to get consistent 32 bytes
  // This allows any length secret to work, but a proper key is preferred
  return crypto.createHash('sha256').update(keySource).digest()
}

/**
 * Encrypt a string value
 * Returns format: iv:encryptedData (both hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a string value
 * Expects format: iv:encryptedData (both hex-encoded)
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()

  const parts = ciphertext.split(':')
  if (parts.length < 2) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts.slice(1).join(':') // Handle case where encrypted text contains ':'

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Safely encrypt - returns null on error instead of throwing
 */
export function safeEncrypt(plaintext: string): string | null {
  try {
    return encrypt(plaintext)
  } catch (error) {
    console.error('Encryption failed:', error)
    return null
  }
}

/**
 * Safely decrypt - returns null on error instead of throwing
 */
export function safeDecrypt(ciphertext: string): string | null {
  try {
    return decrypt(ciphertext)
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

/**
 * Hash a value (one-way, for comparison purposes)
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a cryptographically secure random string (URL-safe)
 */
export function generateSecureTokenUrlSafe(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
