/**
 * EncryptionService
 *
 * Provides client-side encryption/decryption using Web Crypto API.
 * Uses AES-GCM algorithm for secure encryption.
 * Derives encryption key from user's ID for account-based encryption.
 */

import { getLogger } from '../../../../services/index.js';

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT = 'himan-password-manager-v1'; // App-specific salt

  /**
   * Derives a cryptographic key from the user ID
   */
  private static async deriveKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(userId + this.SALT);

    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(this.SALT),
        iterations: 100000,
        hash: 'SHA-256',
      },
      importedKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a password string
   * @param password - The plain text password to encrypt
   * @param userId - The user's ID for key derivation
   * @returns Base64 encoded encrypted string with IV prepended
   */
  static async encrypt(password: string, userId: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const key = await this.deriveKey(userId);

      // Generate a random initialization vector
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encrypt the password
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encoder.encode(password)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      getLogger().error('Encryption error', error);
      throw new Error('Failed to encrypt password');
    }
  }

  /**
   * Decrypts an encrypted password string
   * @param encryptedPassword - The base64 encoded encrypted password with IV
   * @param userId - The user's ID for key derivation
   * @returns The decrypted password string
   */
  static async decrypt(encryptedPassword: string, userId: string): Promise<string> {
    try {
      const key = await this.deriveKey(userId);

      // Decode from base64
      const combined = this.base64ToArrayBuffer(encryptedPassword);

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedData = combined.slice(this.IV_LENGTH);

      // Decrypt the password
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedData
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      getLogger().error('Decryption error', error);
      throw new Error('Failed to decrypt password');
    }
  }

  /**
   * Converts ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts Base64 string to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
