import { createCipher, createDecipher, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Promisify crypto functions
const scryptAsync = promisify(scrypt);

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  version: string;
  keyId: string;
}

export interface TokenMetadata {
  expiresAt: string;
  issuedAt: string;
  rotationCount: number;
  lastRotated: string;
  platform: string;
  scopes: string[];
}

export interface TokenRotationConfig {
  maxAge: number; // in seconds
  rotationThreshold: number; // percentage of max age before rotation
  enableAutoRotation: boolean;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: Buffer;
  private keyDerivationSalt: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly version = '1.0';
  private readonly keyId = 'default';

  private constructor() {
    // Initialize with environment variables or generate new ones
    this.masterKey = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey(), 'hex');
    this.keyDerivationSalt = Buffer.from(process.env.ENCRYPTION_SALT || this.generateSalt(), 'hex');
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt sensitive token data
   */
  public async encryptToken(token: string, metadata?: Partial<TokenMetadata>): Promise<EncryptedData> {
    try {
      // Generate a unique IV for this encryption
      const iv = randomBytes(this.ivLength);
      
      // Derive encryption key from master key
      const derivedKey = await this.deriveKey();
      
      // Create cipher
      const cipher = createCipher(this.algorithm, derivedKey);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata || {})));
      
      // Encrypt the token
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: this.version,
        keyId: this.keyId
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive token data
   */
  public async decryptToken(encryptedData: EncryptedData, metadata?: Partial<TokenMetadata>): Promise<string> {
    try {
      // Validate version compatibility
      if (encryptedData.version !== this.version) {
        throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
      }

      // Derive encryption key from master key
      const derivedKey = await this.deriveKey();
      
      // Create decipher
      const decipher = createDecipher(this.algorithm, derivedKey);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      decipher.setAAD(Buffer.from(JSON.stringify(metadata || {})));
      
      // Decrypt the token
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a token needs rotation based on its metadata
   */
  public shouldRotateToken(metadata: TokenMetadata, config: TokenRotationConfig): boolean {
    if (!config.enableAutoRotation) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(metadata.expiresAt);
    const issuedAt = new Date(metadata.issuedAt);
    
    // Check if token is expired
    if (now >= expiresAt) {
      return true;
    }
    
    // Check if token is approaching expiration
    const totalLifetime = expiresAt.getTime() - issuedAt.getTime();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const timeUntilRotation = totalLifetime * (config.rotationThreshold / 100);
    
    return timeUntilExpiry <= timeUntilRotation;
  }

  /**
   * Generate token metadata for new tokens
   */
  public generateTokenMetadata(platform: string, expiresIn: number, scopes: string[] = []): TokenMetadata {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);
    
    return {
      expiresAt: expiresAt.toISOString(),
      issuedAt: now.toISOString(),
      rotationCount: 0,
      lastRotated: now.toISOString(),
      platform,
      scopes
    };
  }

  /**
   * Update token metadata for rotation
   */
  public updateTokenMetadataForRotation(metadata: TokenMetadata, newExpiresIn: number): TokenMetadata {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + newExpiresIn * 1000);
    
    return {
      ...metadata,
      expiresAt: expiresAt.toISOString(),
      rotationCount: metadata.rotationCount + 1,
      lastRotated: now.toISOString()
    };
  }

  /**
   * Validate token metadata
   */
  public validateTokenMetadata(metadata: TokenMetadata): boolean {
    try {
      const now = new Date();
      const expiresAt = new Date(metadata.expiresAt);
      const issuedAt = new Date(metadata.issuedAt);
      
      // Check if dates are valid
      if (isNaN(expiresAt.getTime()) || isNaN(issuedAt.getTime())) {
        return false;
      }
      
      // Check if issued date is in the future
      if (issuedAt > now) {
        return false;
      }
      
      // Check if rotation count is reasonable
      if (metadata.rotationCount < 0 || metadata.rotationCount > 1000) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random master key
   */
  private generateMasterKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a secure random salt
   */
  private generateSalt(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Derive encryption key from master key using scrypt
   */
  private async deriveKey(): Promise<Buffer> {
    return await scryptAsync(this.masterKey, this.keyDerivationSalt, this.keyLength) as Buffer;
  }

  /**
   * Generate a new encryption key (for key rotation)
   */
  public async generateNewKey(): Promise<{ key: string; salt: string }> {
    const newKey = this.generateMasterKey();
    const newSalt = this.generateSalt();
    
    return {
      key: newKey,
      salt: newSalt
    };
  }

  /**
   * Securely compare two strings (timing-safe)
   */
  public secureCompare(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    
    return timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Get encryption service health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    version: string;
    keyId: string;
    algorithm: string;
    masterKeyConfigured: boolean;
  } {
    return {
      status: this.masterKey.length > 0 ? 'healthy' : 'error',
      version: this.version,
      keyId: this.keyId,
      algorithm: this.algorithm,
      masterKeyConfigured: this.masterKey.length > 0
    };
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();

// Export types for use in database schema
export type EncryptedToken = EncryptedData;
export type TokenRotationPolicy = TokenRotationConfig;
