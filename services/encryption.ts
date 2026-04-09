import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

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
      console.error('Encryption failed:', error);
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
      console.error('Decryption failed:', error);
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
              console.error(`Decryption failed for field ${field}:`, error);
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

  // Helper method for secure key rotation
  static async rotateEncryptionKey(oldSecret: string, newSecret: string): Promise<void> {
    // Implement key rotation logic here
    // This should re-encrypt all sensitive data with the new key
    throw new Error('Key rotation not implemented');
  }
}
