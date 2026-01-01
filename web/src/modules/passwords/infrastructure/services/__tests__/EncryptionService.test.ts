import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  const testUserId = 'test-user-123';
  const testPassword = 'MySecurePassword123!@#';

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a password correctly', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);
      const decrypted = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(testPassword);
    });

    it('should produce different encrypted values for the same password', async () => {
      const encrypted1 = await EncryptionService.encrypt(testPassword, testUserId);
      const encrypted2 = await EncryptionService.encrypt(testPassword, testUserId);

      // Different due to unique IVs
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      const decrypted1 = await EncryptionService.decrypt(encrypted1, testUserId);
      const decrypted2 = await EncryptionService.decrypt(encrypted2, testUserId);

      expect(decrypted1).toBe(testPassword);
      expect(decrypted2).toBe(testPassword);
    });

    it('should handle empty passwords', async () => {
      const emptyPassword = '';
      const encrypted = await EncryptionService.encrypt(emptyPassword, testUserId);
      const decrypted = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(emptyPassword);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const encrypted = await EncryptionService.encrypt(longPassword, testUserId);
      const decrypted = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(longPassword);
    });

    it('should handle special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\\';
      const encrypted = await EncryptionService.encrypt(specialPassword, testUserId);
      const decrypted = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(specialPassword);
    });

    it('should handle unicode characters', async () => {
      const unicodePassword = '密码🔐パスワード';
      const encrypted = await EncryptionService.encrypt(unicodePassword, testUserId);
      const decrypted = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted).toBe(unicodePassword);
    });
  });

  describe('user isolation', () => {
    it('should fail to decrypt with wrong user ID', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);
      const wrongUserId = 'different-user-456';

      await expect(
        EncryptionService.decrypt(encrypted, wrongUserId)
      ).rejects.toThrow('Failed to decrypt password');
    });

    it('should produce different encrypted values for different users', async () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      const encrypted1 = await EncryptionService.encrypt(testPassword, userId1);
      const encrypted2 = await EncryptionService.encrypt(testPassword, userId2);

      // Different encrypted values due to different user IDs
      expect(encrypted1).not.toBe(encrypted2);

      // Each user should be able to decrypt their own
      const decrypted1 = await EncryptionService.decrypt(encrypted1, userId1);
      const decrypted2 = await EncryptionService.decrypt(encrypted2, userId2);

      expect(decrypted1).toBe(testPassword);
      expect(decrypted2).toBe(testPassword);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid encrypted data', async () => {
      const invalidData = 'not-base64-encrypted-data';

      await expect(
        EncryptionService.decrypt(invalidData, testUserId)
      ).rejects.toThrow('Failed to decrypt password');
    });

    it('should throw error for corrupted encrypted data', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);
      // Corrupt the data by changing a character
      const corrupted = encrypted.substring(0, 10) + 'X' + encrypted.substring(11);

      await expect(
        EncryptionService.decrypt(corrupted, testUserId)
      ).rejects.toThrow('Failed to decrypt password');
    });

    it('should throw error for empty encrypted string', async () => {
      await expect(
        EncryptionService.decrypt('', testUserId)
      ).rejects.toThrow('Failed to decrypt password');
    });
  });

  describe('base64 encoding', () => {
    it('should return valid base64 encoded string', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);

      // Base64 regex pattern
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      expect(base64Regex.test(encrypted)).toBe(true);
    });

    it('should be url-safe for storage', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);

      // Should not contain characters that need URL encoding
      expect(encrypted).not.toContain(' ');
      expect(encrypted).not.toContain('\n');
      expect(encrypted).not.toContain('\r');
    });
  });

  describe('consistency', () => {
    it('should consistently decrypt the same encrypted value', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);

      // Decrypt multiple times
      const decrypted1 = await EncryptionService.decrypt(encrypted, testUserId);
      const decrypted2 = await EncryptionService.decrypt(encrypted, testUserId);
      const decrypted3 = await EncryptionService.decrypt(encrypted, testUserId);

      expect(decrypted1).toBe(testPassword);
      expect(decrypted2).toBe(testPassword);
      expect(decrypted3).toBe(testPassword);
    });
  });

  describe('security properties', () => {
    it('should use initialization vector (IV) for each encryption', async () => {
      const encrypted = await EncryptionService.encrypt(testPassword, testUserId);

      // Encrypted string should be longer than just the password (due to IV)
      // IV is 12 bytes = 16 base64 characters minimum
      expect(encrypted.length).toBeGreaterThan(16);
    });

    it('should handle concurrent encrypt/decrypt operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        EncryptionService.encrypt(`password-${i}`, testUserId).then((encrypted) =>
          EncryptionService.decrypt(encrypted, testUserId)
        )
      );

      const results = await Promise.all(operations);

      results.forEach((result, i) => {
        expect(result).toBe(`password-${i}`);
      });
    });
  });
});
