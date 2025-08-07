import { encryptionService, EncryptedData, TokenMetadata, TokenRotationConfig } from './encryption-service';
import { createClient } from '@supabase/supabase-js';
import type { EnhancedDatabase } from '../types/enhanced-database';

export interface TokenInfo {
  id: string;
  platform: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scopes: string[];
  isActive: boolean;
  lastRotated: string;
  rotationCount: number;
}

export interface TokenRotationResult {
  success: boolean;
  newToken?: string;
  newRefreshToken?: string;
  newExpiresAt?: string;
  error?: string;
  requiresReauth?: boolean;
}

export class TokenManagementService {
  private supabase;
  private rotationConfig: TokenRotationConfig;

  constructor() {
    this.supabase = createClient<EnhancedDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Default rotation configuration
    this.rotationConfig = {
      maxAge: 60 * 60 * 24 * 90, // 90 days
      rotationThreshold: 20, // Rotate when 20% of lifetime remains
      enableAutoRotation: true
    };
  }

  /**
   * Store a new token with encryption
   */
  public async storeToken(
    userId: string,
    organizationId: string | null,
    platform: string,
    username: string,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    scopes: string[] = []
  ): Promise<string> {
    try {
      // Generate token metadata
      const metadata = encryptionService.generateTokenMetadata(
        platform,
        expiresIn || this.rotationConfig.maxAge,
        scopes
      );

      // Encrypt tokens
      const encryptedAccessToken = await encryptionService.encryptToken(accessToken, metadata);
      const encryptedRefreshToken = refreshToken 
        ? await encryptionService.encryptToken(refreshToken, metadata)
        : null;

      // Store in database
      const { data, error } = await this.supabase
        .from('social_accounts')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          platform: platform as any,
          username,
          access_token: JSON.stringify(encryptedAccessToken),
          refresh_token: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          token_expires_at: metadata.expiresAt,
          status: 'connected',
          platform_metadata: {
            tokenMetadata: metadata,
            scopes,
            encryptionVersion: encryptedAccessToken.version
          }
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store token: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      throw new Error(`Token storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and decrypt a token
   */
  public async getToken(accountId: string): Promise<TokenInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('social_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error || !data) {
        return null;
      }

      // Parse encrypted tokens
      const encryptedAccessToken: EncryptedData = JSON.parse(data.access_token || '{}');
      const encryptedRefreshToken: EncryptedData | null = data.refresh_token 
        ? JSON.parse(data.refresh_token)
        : null;

      // Get token metadata
      const metadata: TokenMetadata = data.platform_metadata?.tokenMetadata || {};

      // Decrypt tokens
      const accessToken = await encryptionService.decryptToken(encryptedAccessToken, metadata);
      const refreshToken = encryptedRefreshToken 
        ? await encryptionService.decryptToken(encryptedRefreshToken, metadata)
        : undefined;

      return {
        id: data.id,
        platform: data.platform,
        username: data.username,
        accessToken,
        refreshToken,
        expiresAt: metadata.expiresAt,
        scopes: metadata.scopes || [],
        isActive: data.status === 'connected',
        lastRotated: metadata.lastRotated,
        rotationCount: metadata.rotationCount
      };
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * Get all tokens for a user
   */
  public async getUserTokens(userId: string, organizationId?: string): Promise<TokenInfo[]> {
    try {
      const query = this.supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId);

      if (organizationId) {
        query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to retrieve tokens: ${error.message}`);
      }

      const tokens: TokenInfo[] = [];

      for (const account of data || []) {
        try {
          const tokenInfo = await this.getToken(account.id);
          if (tokenInfo) {
            tokens.push(tokenInfo);
          }
        } catch (error) {
          console.error(`Failed to decrypt token for account ${account.id}:`, error);
        }
      }

      return tokens;
    } catch (error) {
      throw new Error(`Token retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a token needs rotation
   */
  public async checkTokenRotation(accountId: string): Promise<boolean> {
    try {
      const tokenInfo = await this.getToken(accountId);
      if (!tokenInfo) {
        return false;
      }

      const metadata: TokenMetadata = {
        expiresAt: tokenInfo.expiresAt,
        issuedAt: tokenInfo.lastRotated,
        rotationCount: tokenInfo.rotationCount,
        lastRotated: tokenInfo.lastRotated,
        platform: tokenInfo.platform,
        scopes: tokenInfo.scopes
      };

      return encryptionService.shouldRotateToken(metadata, this.rotationConfig);
    } catch (error) {
      console.error('Token rotation check failed:', error);
      return false;
    }
  }

  /**
   * Rotate a token (requires platform-specific implementation)
   */
  public async rotateToken(accountId: string): Promise<TokenRotationResult> {
    try {
      const tokenInfo = await this.getToken(accountId);
      if (!tokenInfo) {
        return { success: false, error: 'Token not found' };
      }

      // Check if token has refresh token
      if (!tokenInfo.refreshToken) {
        return { 
          success: false, 
          error: 'No refresh token available',
          requiresReauth: true 
        };
      }

      // This would typically call the platform's OAuth refresh endpoint
      // For now, we'll simulate the rotation
      const rotationResult = await this.performTokenRotation(tokenInfo);
      
      if (rotationResult.success && rotationResult.newToken) {
        // Update stored token
        await this.updateStoredToken(accountId, rotationResult);
      }

      return rotationResult;
    } catch (error) {
      return { 
        success: false, 
        error: `Token rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Update stored token after rotation
   */
  private async updateStoredToken(
    accountId: string, 
    rotationResult: TokenRotationResult
  ): Promise<void> {
    try {
      const tokenInfo = await this.getToken(accountId);
      if (!tokenInfo) {
        throw new Error('Token not found for update');
      }

      // Update metadata for rotation
      const newMetadata = encryptionService.updateTokenMetadataForRotation(
        {
          expiresAt: tokenInfo.expiresAt,
          issuedAt: tokenInfo.lastRotated,
          rotationCount: tokenInfo.rotationCount,
          lastRotated: tokenInfo.lastRotated,
          platform: tokenInfo.platform,
          scopes: tokenInfo.scopes
        },
        this.rotationConfig.maxAge
      );

      // Encrypt new tokens
      const encryptedAccessToken = await encryptionService.encryptToken(
        rotationResult.newToken!,
        newMetadata
      );
      
      const encryptedRefreshToken = rotationResult.newRefreshToken
        ? await encryptionService.encryptToken(rotationResult.newRefreshToken, newMetadata)
        : null;

      // Update database
      const { error } = await this.supabase
        .from('social_accounts')
        .update({
          access_token: JSON.stringify(encryptedAccessToken),
          refresh_token: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          token_expires_at: rotationResult.newExpiresAt || newMetadata.expiresAt,
          platform_metadata: {
            tokenMetadata: newMetadata,
            scopes: tokenInfo.scopes,
            encryptionVersion: encryptedAccessToken.version,
            lastRotation: new Date().toISOString()
          }
        })
        .eq('id', accountId);

      if (error) {
        throw new Error(`Failed to update token: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Token update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform actual token rotation (platform-specific)
   */
  private async performTokenRotation(tokenInfo: TokenInfo): Promise<TokenRotationResult> {
    // This is a placeholder implementation
    // In a real implementation, you would call the platform's OAuth refresh endpoint
    
    try {
      // Simulate API call to refresh token
      // const response = await fetch(`${platformApiUrl}/oauth/refresh`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ refresh_token: tokenInfo.refreshToken })
      // });

      // For now, return a simulated successful rotation
      const newExpiresIn = this.rotationConfig.maxAge;
      const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000).toISOString();

      return {
        success: true,
        newToken: 'simulated_new_access_token',
        newRefreshToken: 'simulated_new_refresh_token',
        newExpiresAt
      };
    } catch (error) {
      return {
        success: false,
        error: `Platform token rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Revoke a token
   */
  public async revokeToken(accountId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('social_accounts')
        .update({
          status: 'disconnected',
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          platform_metadata: {
            revokedAt: new Date().toISOString(),
            reason: 'user_revoked'
          }
        })
        .eq('id', accountId);

      if (error) {
        throw new Error(`Failed to revoke token: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Get tokens that need rotation
   */
  public async getTokensNeedingRotation(userId: string): Promise<TokenInfo[]> {
    try {
      const allTokens = await this.getUserTokens(userId);
      const tokensNeedingRotation: TokenInfo[] = [];

      for (const token of allTokens) {
        if (await this.checkTokenRotation(token.id)) {
          tokensNeedingRotation.push(token);
        }
      }

      return tokensNeedingRotation;
    } catch (error) {
      throw new Error(`Failed to get tokens needing rotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set rotation configuration
   */
  public setRotationConfig(config: Partial<TokenRotationConfig>): void {
    this.rotationConfig = { ...this.rotationConfig, ...config };
  }

  /**
   * Get rotation configuration
   */
  public getRotationConfig(): TokenRotationConfig {
    return { ...this.rotationConfig };
  }

  /**
   * Validate token health
   */
  public async validateTokenHealth(accountId: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
    needsRotation: boolean;
    daysUntilExpiry: number;
    lastRotated: string;
  }> {
    try {
      const tokenInfo = await this.getToken(accountId);
      if (!tokenInfo) {
        return {
          isValid: false,
          isExpired: true,
          needsRotation: true,
          daysUntilExpiry: 0,
          lastRotated: ''
        };
      }

      const now = new Date();
      const expiresAt = new Date(tokenInfo.expiresAt);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = now >= expiresAt;
      const needsRotation = await this.checkTokenRotation(accountId);

      return {
        isValid: !isExpired && tokenInfo.isActive,
        isExpired,
        needsRotation,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        lastRotated: tokenInfo.lastRotated
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: true,
        needsRotation: true,
        daysUntilExpiry: 0,
        lastRotated: ''
      };
    }
  }
}

// Export singleton instance
export const tokenManagementService = new TokenManagementService();
