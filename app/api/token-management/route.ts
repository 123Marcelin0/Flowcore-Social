import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tokenManagementService } from '../../../lib/token-management-service';
import { encryptionService } from '../../../lib/encryption-service';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Check authentication via authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return await getTokenHealth(user.id);
      
      case 'rotation-status':
        return await getRotationStatus(user.id);
      
      case 'encryption-status':
        return await getEncryptionStatus();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Token management GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication via authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, accountId, ...params } = body;

    switch (action) {
      case 'rotate':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }
        return await rotateToken(accountId);
      
      case 'revoke':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }
        return await revokeToken(accountId);
      
      case 'store':
        return await storeToken(user.id, params);
      
      case 'validate':
        if (!accountId) {
          return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }
        return await validateToken(accountId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Token management POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get token health for all user tokens
 */
async function getTokenHealth(userId: string) {
  try {
    const tokens = await tokenManagementService.getUserTokens(userId);
    const healthData = [];

    for (const token of tokens) {
      const health = await tokenManagementService.validateTokenHealth(token.id);
      healthData.push({
        accountId: token.id,
        platform: token.platform,
        username: token.username,
        ...health
      });
    }

    return NextResponse.json({
      success: true,
      data: healthData,
      summary: {
        total: healthData.length,
        healthy: healthData.filter(h => h.isValid).length,
        expired: healthData.filter(h => h.isExpired).length,
        needsRotation: healthData.filter(h => h.needsRotation).length
      }
    });
  } catch (error) {
    console.error('Token health check error:', error);
    return NextResponse.json(
      { error: 'Failed to check token health' },
      { status: 500 }
    );
  }
}

/**
 * Get rotation status for user tokens
 */
async function getRotationStatus(userId: string) {
  try {
    const tokensNeedingRotation = await tokenManagementService.getTokensNeedingRotation(userId);
    
    return NextResponse.json({
      success: true,
      data: tokensNeedingRotation.map(token => ({
        accountId: token.id,
        platform: token.platform,
        username: token.username,
        expiresAt: token.expiresAt,
        lastRotated: token.lastRotated,
        rotationCount: token.rotationCount
      })),
      count: tokensNeedingRotation.length
    });
  } catch (error) {
    console.error('Rotation status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check rotation status' },
      { status: 500 }
    );
  }
}

/**
 * Get encryption service status
 */
async function getEncryptionStatus() {
  try {
    const health = encryptionService.getHealthStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        status: health.status,
        version: health.version,
        algorithm: health.algorithm,
        keyId: health.keyId,
        masterKeyConfigured: health.masterKeyConfigured
      }
    });
  } catch (error) {
    console.error('Encryption status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check encryption status' },
      { status: 500 }
    );
  }
}

/**
 * Rotate a specific token
 */
async function rotateToken(accountId: string) {
  try {
    const result = await tokenManagementService.rotateToken(accountId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Token rotated successfully',
        data: {
          newExpiresAt: result.newExpiresAt
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        requiresReauth: result.requiresReauth || false
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Token rotation error:', error);
    return NextResponse.json(
      { error: 'Failed to rotate token' },
      { status: 500 }
    );
  }
}

/**
 * Revoke a specific token
 */
async function revokeToken(accountId: string) {
  try {
    const success = await tokenManagementService.revokeToken(accountId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Token revoked successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to revoke token'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Token revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}

/**
 * Store a new token
 */
async function storeToken(userId: string, params: any) {
  try {
    const {
      organizationId,
      platform,
      username,
      accessToken,
      refreshToken,
      expiresIn,
      scopes
    } = params;

    if (!platform || !username || !accessToken) {
      return NextResponse.json({
        error: 'Missing required parameters: platform, username, accessToken'
      }, { status: 400 });
    }

    const accountId = await tokenManagementService.storeToken(
      userId,
      organizationId,
      platform,
      username,
      accessToken,
      refreshToken,
      expiresIn,
      scopes
    );

    return NextResponse.json({
      success: true,
      message: 'Token stored successfully',
      data: { accountId }
    });
  } catch (error) {
    console.error('Token storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store token' },
      { status: 500 }
    );
  }
}

/**
 * Validate a specific token
 */
async function validateToken(accountId: string) {
  try {
    const health = await tokenManagementService.validateTokenHealth(accountId);
    
    return NextResponse.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}
