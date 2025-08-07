# Token Encryption Implementation Guide

## Overview

This document describes the comprehensive token encryption system implemented to secure sensitive OAuth tokens (access tokens and refresh tokens) in the social media dashboard. The system uses AES-256-GCM encryption with secure key management and includes token rotation and expiration tracking capabilities.

## Security Features

### 🔐 Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits (32 bytes)
- **IV Length**: 128 bits (16 bytes)
- **Authentication Tag**: 128 bits (16 bytes)
- **Key Derivation**: PBKDF2 with scrypt

### 🛡️ Security Measures
- **Encryption at Rest**: All tokens are encrypted before database storage
- **Authenticated Encryption**: GCM mode provides both confidentiality and integrity
- **Unique IVs**: Each encryption operation uses a cryptographically secure random IV
- **Key Management**: Secure master key derivation with salt
- **Token Rotation**: Automatic token rotation with configurable thresholds
- **Audit Logging**: All token operations are logged for security monitoring

## Architecture

### Core Components

1. **EncryptionService** (`lib/encryption-service.ts`)
   - Handles encryption/decryption operations
   - Manages encryption keys and metadata
   - Provides token rotation logic

2. **TokenManagementService** (`lib/token-management-service.ts`)
   - High-level token operations
   - Database integration
   - Token health monitoring

3. **Database Schema** (`database/encrypt_existing_tokens.sql`)
   - Enhanced social_accounts table
   - Token management functions
   - Audit triggers and monitoring views

4. **API Endpoints** (`app/api/token-management/route.ts`)
   - RESTful token management operations
   - Health monitoring endpoints

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Encryption Configuration
ENCRYPTION_MASTER_KEY=your-64-character-hex-master-key
ENCRYPTION_SALT=your-64-character-hex-salt

# Optional: Generate new keys
# ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
# ENCRYPTION_SALT=$(openssl rand -hex 32)
```

### 2. Database Migration

Run the database migration script to add encryption support:

```sql
-- Execute the migration script
\i database/encrypt_existing_tokens.sql
```

### 3. Token Migration

Migrate existing unencrypted tokens to the new encrypted format:

```bash
# Dry run first (recommended)
node scripts/migrate-tokens-to-encryption.js --dry-run

# Run the actual migration
node scripts/migrate-tokens-to-encryption.js --batch-size=50
```

## Usage Examples

### Storing a New Token

```typescript
import { tokenManagementService } from '../lib/token-management-service';

// Store a new token
const accountId = await tokenManagementService.storeToken(
  userId,
  organizationId,
  'instagram',
  'username',
  'access_token_here',
  'refresh_token_here',
  60 * 60 * 24 * 90, // 90 days
  ['basic', 'comments'] // scopes
);
```

### Retrieving a Token

```typescript
// Get token info (automatically decrypted)
const tokenInfo = await tokenManagementService.getToken(accountId);

if (tokenInfo) {
  console.log('Access Token:', tokenInfo.accessToken);
  console.log('Expires At:', tokenInfo.expiresAt);
  console.log('Rotation Count:', tokenInfo.rotationCount);
}
```

### Token Health Monitoring

```typescript
// Check if token needs rotation
const needsRotation = await tokenManagementService.checkTokenRotation(accountId);

// Get comprehensive health status
const health = await tokenManagementService.validateTokenHealth(accountId);
console.log('Token Health:', {
  isValid: health.isValid,
  isExpired: health.isExpired,
  needsRotation: health.needsRotation,
  daysUntilExpiry: health.daysUntilExpiry
});
```

### Token Rotation

```typescript
// Rotate a token
const result = await tokenManagementService.rotateToken(accountId);

if (result.success) {
  console.log('Token rotated successfully');
  console.log('New expiry:', result.newExpiresAt);
} else if (result.requiresReauth) {
  console.log('Token requires re-authentication');
} else {
  console.log('Rotation failed:', result.error);
}
```

## API Endpoints

### GET /api/token-management

#### Health Check
```bash
GET /api/token-management?action=health
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "accountId": "uuid",
      "platform": "instagram",
      "username": "user123",
      "isValid": true,
      "isExpired": false,
      "needsRotation": false,
      "daysUntilExpiry": 45,
      "lastRotated": "2024-01-15T10:30:00Z"
    }
  ],
  "summary": {
    "total": 3,
    "healthy": 2,
    "expired": 1,
    "needsRotation": 0
  }
}
```

#### Rotation Status
```bash
GET /api/token-management?action=rotation-status
```

#### Encryption Status
```bash
GET /api/token-management?action=encryption-status
```

### POST /api/token-management

#### Store Token
```bash
POST /api/token-management
Content-Type: application/json

{
  "action": "store",
  "platform": "instagram",
  "username": "user123",
  "accessToken": "token_here",
  "refreshToken": "refresh_token_here",
  "expiresIn": 7776000,
  "scopes": ["basic", "comments"]
}
```

#### Rotate Token
```bash
POST /api/token-management
Content-Type: application/json

{
  "action": "rotate",
  "accountId": "uuid"
}
```

#### Revoke Token
```bash
POST /api/token-management
Content-Type: application/json

{
  "action": "revoke",
  "accountId": "uuid"
}
```

## Database Schema

### Enhanced social_accounts Table

```sql
-- New columns for token management
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS:
- token_encryption_version VARCHAR(10) DEFAULT '1.0'
- token_rotation_count INTEGER DEFAULT 0
- token_last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- token_scopes TEXT[] DEFAULT '{}'
- token_metadata JSONB DEFAULT '{}'

-- Existing columns now store encrypted data
- access_token: JSON stringified EncryptedData
- refresh_token: JSON stringified EncryptedData
```

### EncryptedData Structure

```typescript
interface EncryptedData {
  encrypted: string;    // Hex-encoded encrypted data
  iv: string;          // Hex-encoded initialization vector
  authTag: string;     // Hex-encoded authentication tag
  version: string;     // Encryption version
  keyId: string;       // Key identifier
}
```

## Security Considerations

### Key Management
- **Master Key**: Store securely in environment variables
- **Key Rotation**: Implement regular key rotation procedures
- **Backup**: Secure backup of encryption keys
- **Access Control**: Limit access to encryption keys

### Token Lifecycle
- **Expiration**: Monitor token expiration dates
- **Rotation**: Implement automatic token rotation
- **Revocation**: Provide secure token revocation
- **Audit**: Log all token operations

### Database Security
- **RLS Policies**: Row-level security for token access
- **Encryption**: Database-level encryption (if available)
- **Backup Encryption**: Encrypt database backups
- **Access Logging**: Monitor database access

## Monitoring and Maintenance

### Health Checks

```typescript
// Check encryption service health
const health = encryptionService.getHealthStatus();
console.log('Encryption Health:', health);

// Monitor token health
const tokens = await tokenManagementService.getUserTokens(userId);
for (const token of tokens) {
  const health = await tokenManagementService.validateTokenHealth(token.id);
  if (!health.isValid) {
    console.warn(`Token ${token.id} needs attention`);
  }
}
```

### Automated Tasks

1. **Token Rotation**: Set up cron jobs for automatic token rotation
2. **Health Monitoring**: Regular health checks and alerts
3. **Audit Review**: Periodic review of audit logs
4. **Key Rotation**: Scheduled encryption key rotation

### Alerting

Monitor for:
- Failed encryption/decryption operations
- Token expiration warnings
- Rotation failures
- Unusual access patterns

## Troubleshooting

### Common Issues

1. **Encryption Service Not Healthy**
   - Check environment variables
   - Verify master key format
   - Ensure proper initialization

2. **Token Decryption Failures**
   - Check encryption version compatibility
   - Verify token metadata
   - Review audit logs

3. **Migration Issues**
   - Run dry-run first
   - Check database permissions
   - Verify token format

### Debug Commands

```bash
# Check encryption service status
curl "http://localhost:3000/api/token-management?action=encryption-status"

# Test token health
curl "http://localhost:3000/api/token-management?action=health"

# Validate specific token
curl -X POST "http://localhost:3000/api/token-management" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "accountId": "uuid"}'
```

## Performance Considerations

### Optimization Tips
- **Batch Operations**: Use batch processing for large token sets
- **Caching**: Cache frequently accessed token metadata
- **Indexing**: Ensure proper database indexing
- **Connection Pooling**: Optimize database connections

### Scaling
- **Horizontal Scaling**: Distribute encryption load
- **Key Sharding**: Use multiple encryption keys
- **Database Partitioning**: Partition large token tables
- **CDN Integration**: Cache token metadata globally

## Compliance and Standards

### Security Standards
- **OWASP**: Follow OWASP security guidelines
- **NIST**: Implement NIST cryptographic standards
- **GDPR**: Ensure data protection compliance
- **SOC 2**: Maintain SOC 2 compliance requirements

### Audit Requirements
- **Access Logging**: Log all token access
- **Change Tracking**: Track all token modifications
- **Retention Policies**: Implement data retention policies
- **Incident Response**: Plan for security incidents

## Future Enhancements

### Planned Features
1. **Hardware Security Modules (HSM)**: Integrate with HSM for key management
2. **Multi-Key Encryption**: Support for multiple encryption keys
3. **Zero-Knowledge Proofs**: Implement zero-knowledge authentication
4. **Quantum-Resistant Algorithms**: Prepare for post-quantum cryptography

### Roadmap
- **Q1 2024**: HSM integration
- **Q2 2024**: Multi-key support
- **Q3 2024**: Advanced monitoring
- **Q4 2024**: Quantum-resistant preparation

## Support and Resources

### Documentation
- [Encryption Service API](./lib/encryption-service.ts)
- [Token Management API](./lib/token-management-service.ts)
- [Database Schema](./database/encrypt_existing_tokens.sql)

### Tools
- [Migration Script](./scripts/migrate-tokens-to-encryption.js)
- [Health Check API](./app/api/token-management/route.ts)
- [Database Functions](./database/encrypt_existing_tokens.sql)

### Security Contacts
- **Security Team**: security@company.com
- **DevOps Team**: devops@company.com
- **Emergency**: security-emergency@company.com

---

**Note**: This implementation provides enterprise-grade security for token management. Regular security audits and updates are recommended to maintain the highest security standards.
