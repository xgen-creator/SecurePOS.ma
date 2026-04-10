import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { createLogger } from './utils/logger';

const logger = createLogger('EncryptionService');

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;

  static async encrypt(data: string | Buffer): Promise<{
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
    salt: Buffer;
  }> {
    try {
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);
      
      const key = await this.deriveKey(salt);
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv,
        authTag,
        salt
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw new Error('Encryption failed');
    }
  }

  static async decrypt(encrypted: Buffer, iv: Buffer, authTag: Buffer, salt: Buffer): Promise<Buffer> {
    try {
      const key = await this.deriveKey(salt);
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
    } catch (error) {
      logger.error('Decryption failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw new Error('Decryption failed - data may be corrupted or tampered');
    }
  }

  private static async deriveKey(salt: Buffer): Promise<Buffer> {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('ENCRYPTION_SECRET environment variable is required and must be at least 32 characters');
    }
    const scryptAsync = promisify(scrypt);
    return scryptAsync(
      secret,
      salt,
      this.KEY_LENGTH
    ) as Promise<Buffer>;
  }

  static async encryptField(value: string): Promise<string> {
    const { encrypted, iv, authTag, salt } = await this.encrypt(value);
    
    return JSON.stringify({
      e: encrypted.toString('base64'),
      i: iv.toString('base64'),
      a: authTag.toString('base64'),
      s: salt.toString('base64')
    });
  }

  static async decryptField(encryptedJson: string): Promise<string> {
    const { e, i, a, s } = JSON.parse(encryptedJson);
    
    const decrypted = await this.decrypt(
      Buffer.from(e, 'base64'),
      Buffer.from(i, 'base64'),
      Buffer.from(a, 'base64'),
      Buffer.from(s, 'base64')
    );
    
    return decrypted.toString();
  }

  // Mongoose plugin for automatic field encryption
  static encryptionPlugin(schema: any, options: { fields: string[] }) {
    const fields = options.fields || [];

    schema.pre('save', async function(next: Function) {
      for (const field of fields) {
        if (this.isModified(field) && this[field]) {
          try {
            this[field] = await EncryptionService.encryptField(this[field]);
          } catch (error) {
            next(error);
          }
        }
      }
      next();
    });

    schema.post('find', async function(docs: any[]) {
      for (const doc of docs) {
        for (const field of fields) {
          if (doc[field]) {
            try {
              doc[field] = await EncryptionService.decryptField(doc[field]);
            } catch (error) {
              logger.error(`Decryption failed for field`, { field, error: error instanceof Error ? error.message : 'Unknown' });
            }
          }
        }
      }
    });
  }

  // Helper method for encrypting files
  static async encryptFile(fileBuffer: Buffer): Promise<{
    encryptedFile: Buffer;
    metadata: {
      iv: string;
      authTag: string;
      salt: string;
    };
  }> {
    const { encrypted, iv, authTag, salt } = await this.encrypt(fileBuffer);
    
    return {
      encryptedFile: encrypted,
      metadata: {
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        salt: salt.toString('base64')
      }
    };
  }

  // Helper method for decrypting files
  static async decryptFile(
    encryptedFile: Buffer,
    metadata: {
      iv: string;
      authTag: string;
      salt: string;
    }
  ): Promise<Buffer> {
    return this.decrypt(
      encryptedFile,
      Buffer.from(metadata.iv, 'base64'),
      Buffer.from(metadata.authTag, 'base64'),
      Buffer.from(metadata.salt, 'base64')
    );
  }

  /**
   * Rotates encryption key by re-encrypting data with a new secret
   * @param encryptedData - Array of encrypted data to rotate (format: {e, i, a, s})
   * @param oldSecret - Current encryption secret
   * @param newSecret - New encryption secret (min 32 chars)
   * @returns Array of re-encrypted data with new key
   */
  static async rotateEncryptionKey(
    encryptedData: string[],
    oldSecret: string,
    newSecret: string
  ): Promise<string[]> {
    // Validate secrets
    if (!oldSecret || oldSecret.length < 32) {
      throw new Error('Old secret must be at least 32 characters');
    }
    if (!newSecret || newSecret.length < 32) {
      throw new Error('New secret must be at least 32 characters');
    }
    if (oldSecret === newSecret) {
      throw new Error('New secret must be different from old secret');
    }

    const results: string[] = [];

    try {
      logger.info('Starting key rotation', { dataCount: encryptedData.length });

      for (const data of encryptedData) {
        try {
          // Step 1: Decrypt with old key
          const { e, i, a, s } = JSON.parse(data);
          const decrypted = await this.decryptWithSecret(
            Buffer.from(e, 'base64'),
            Buffer.from(i, 'base64'),
            Buffer.from(a, 'base64'),
            Buffer.from(s, 'base64'),
            oldSecret
          );

          // Step 2: Encrypt with new key
          const { encrypted, iv, authTag, salt } = await this.encryptWithSecret(decrypted, newSecret);

          // Step 3: Store new encrypted format
          results.push(JSON.stringify({
            e: encrypted.toString('base64'),
            i: iv.toString('base64'),
            a: authTag.toString('base64'),
            s: salt.toString('base64')
          }));
        } catch (error) {
          logger.error('Failed to rotate key for data item', { error: error instanceof Error ? error.message : 'Unknown' });
          throw new Error('Key rotation failed - some data could not be decrypted with old key');
        }
      }

      logger.info('Key rotation completed successfully', { rotatedCount: results.length });
      return results;
    } catch (error) {
      logger.error('Key rotation failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw error;
    }
  }

  /**
   * Encrypts data using a specific secret (not env var)
   * @internal Used by rotateEncryptionKey
   */
  private static async encryptWithSecret(data: string | Buffer, secret: string): Promise<{
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
    salt: Buffer;
  }> {
    const salt = randomBytes(this.SALT_LENGTH);
    const iv = randomBytes(this.IV_LENGTH);
    
    const scryptAsync = promisify(scrypt);
    const key = await scryptAsync(secret, salt, this.KEY_LENGTH) as Buffer;
    
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag, salt };
  }

  /**
   * Decrypts data using a specific secret (not env var)
   * @internal Used by rotateEncryptionKey
   */
  private static async decryptWithSecret(
    encrypted: Buffer,
    iv: Buffer,
    authTag: Buffer,
    salt: Buffer,
    secret: string
  ): Promise<Buffer> {
    const scryptAsync = promisify(scrypt);
    const key = await scryptAsync(secret, salt, this.KEY_LENGTH) as Buffer;
    
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
