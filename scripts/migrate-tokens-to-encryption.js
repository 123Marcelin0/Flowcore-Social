#!/usr/bin/env node

/**
 * Token Migration Script
 * 
 * This script migrates existing unencrypted tokens in the database to the new
 * encrypted format using AES-256-GCM encryption.
 * 
 * Usage:
 *   node scripts/migrate-tokens-to-encryption.js [--dry-run] [--batch-size=100]
 * 
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - ENCRYPTION_MASTER_KEY (optional, will generate if not provided)
 *   - ENCRYPTION_SALT (optional, will generate if not provided)
 */

const { createClient } = require('@supabase/supabase-js');
const { encryptionService } = require('../lib/encryption-service');
const { tokenManagementService } = require('../lib/token-management-service');

// Configuration
const config = {
  dryRun: process.argv.includes('--dry-run'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
  maxRetries: 3,
  retryDelay: 1000, // ms
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}SUCCESS: ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}WARNING: ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}INFO: ${message}${colors.reset}`);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Get tokens that need encryption
 */
async function getTokensNeedingEncryption() {
  try {
    const { data, error } = await supabase
      .rpc('mark_tokens_for_encryption');

    if (error) {
      throw new Error(`Failed to get tokens needing encryption: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    logError(`Error getting tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Encrypt a single token
 */
async function encryptToken(accountId, platform, username, accessToken, refreshToken = null) {
  try {
    // Generate metadata for the token
    const metadata = encryptionService.generateTokenMetadata(
      platform,
      60 * 60 * 24 * 90, // 90 days default
      [] // Default scopes
    );

    // Encrypt tokens
    const encryptedAccessToken = await encryptionService.encryptToken(accessToken, metadata);
    const encryptedRefreshToken = refreshToken 
      ? await encryptionService.encryptToken(refreshToken, metadata)
      : null;

    // Prepare token metadata
    const tokenMetadata = {
      tokenMetadata: metadata,
      scopes: [],
      encryptionVersion: encryptedAccessToken.version,
      migratedAt: new Date().toISOString(),
      migrationSource: 'legacy_unencrypted'
    };

    if (config.dryRun) {
      logInfo(`[DRY RUN] Would encrypt token for ${platform}:${username}`);
      return { success: true, dryRun: true };
    }

    // Update the database
    const { error } = await supabase
      .rpc('update_token_encryption_status', {
        p_account_id: accountId,
        p_encrypted_access_token: JSON.stringify(encryptedAccessToken),
        p_encrypted_refresh_token: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
        p_token_metadata: tokenMetadata
      });

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    logError(`Encryption failed for ${platform}:${username}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process tokens in batches
 */
async function processTokenBatch(tokens, startIndex) {
  const batch = tokens.slice(startIndex, startIndex + config.batchSize);
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  logInfo(`Processing batch ${Math.floor(startIndex / config.batchSize) + 1} (${batch.length} tokens)`);

  for (const token of batch) {
    try {
      // Get the current token data
      const { data: accountData, error: fetchError } = await supabase
        .from('social_accounts')
        .select('access_token, refresh_token')
        .eq('id', token.account_id)
        .single();

      if (fetchError || !accountData) {
        results.failed++;
        results.errors.push(`Failed to fetch token data for ${token.account_id}: ${fetchError?.message || 'Not found'}`);
        continue;
      }

      // Skip if already encrypted
      if (accountData.access_token && accountData.access_token.startsWith('{"encrypted":')) {
        logInfo(`Token ${token.account_id} already encrypted, skipping`);
        continue;
      }

      // Encrypt the token
      const result = await encryptToken(
        token.account_id,
        token.platform,
        token.username,
        accountData.access_token,
        accountData.refresh_token
      );

      if (result.success) {
        results.success++;
        logSuccess(`Encrypted token for ${token.platform}:${token.username}`);
      } else {
        results.failed++;
        results.errors.push(`Failed to encrypt ${token.platform}:${token.username}: ${result.error}`);
      }

      // Add delay between operations to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      results.failed++;
      results.errors.push(`Unexpected error processing ${token.account_id}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Main migration function
 */
async function migrateTokens() {
  log(`${colors.bright}Token Migration Script${colors.reset}`, 'bright');
  log('=====================================', 'bright');
  
  if (config.dryRun) {
    logWarning('DRY RUN MODE - No changes will be made to the database');
  }

  // Check encryption service health
  const health = encryptionService.getHealthStatus();
  logInfo(`Encryption service status: ${health.status}`);
  logInfo(`Encryption algorithm: ${health.algorithm}`);
  logInfo(`Encryption version: ${health.version}`);

  if (health.status === 'error') {
    logError('Encryption service is not healthy. Please check your configuration.');
    process.exit(1);
  }

  try {
    // Get tokens that need encryption
    logInfo('Fetching tokens that need encryption...');
    const tokensNeedingEncryption = await getTokensNeedingEncryption();
    
    if (tokensNeedingEncryption.length === 0) {
      logSuccess('No tokens found that need encryption!');
      return;
    }

    logInfo(`Found ${tokensNeedingEncryption.length} tokens that need encryption`);

    // Process tokens in batches
    const totalBatches = Math.ceil(tokensNeedingEncryption.length / config.batchSize);
    const overallResults = {
      total: tokensNeedingEncryption.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < tokensNeedingEncryption.length; i += config.batchSize) {
      const batchResults = await processTokenBatch(tokensNeedingEncryption, i);
      
      overallResults.success += batchResults.success;
      overallResults.failed += batchResults.failed;
      overallResults.errors.push(...batchResults.errors);

      // Progress update
      const progress = Math.min(i + config.batchSize, tokensNeedingEncryption.length);
      logInfo(`Progress: ${progress}/${tokensNeedingEncryption.length} tokens processed`);

      // Add delay between batches
      if (i + config.batchSize < tokensNeedingEncryption.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final summary
    log('\n' + '='.repeat(50), 'bright');
    log('MIGRATION SUMMARY', 'bright');
    log('='.repeat(50), 'bright');
    log(`Total tokens processed: ${overallResults.total}`, 'cyan');
    log(`Successfully encrypted: ${overallResults.success}`, 'green');
    log(`Failed to encrypt: ${overallResults.failed}`, overallResults.failed > 0 ? 'red' : 'green');

    if (overallResults.errors.length > 0) {
      log('\nErrors encountered:', 'red');
      overallResults.errors.slice(0, 10).forEach(error => {
        log(`  - ${error}`, 'red');
      });
      
      if (overallResults.errors.length > 10) {
        log(`  ... and ${overallResults.errors.length - 10} more errors`, 'red');
      }
    }

    if (overallResults.failed === 0) {
      logSuccess('All tokens successfully migrated!');
    } else {
      logWarning(`${overallResults.failed} tokens failed to migrate. Check the errors above.`);
    }

  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Validate environment
 */
function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(', ')}`);
    logError('Please set these variables before running the migration script.');
    process.exit(1);
  }

  logInfo('Environment validation passed');
}

/**
 * Show help
 */
function showHelp() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    log(`${colors.bright}Token Migration Script Help${colors.reset}`, 'bright');
    log('');
    log('Usage: node scripts/migrate-tokens-to-encryption.js [options]');
    log('');
    log('Options:');
    log('  --dry-run              Run in dry-run mode (no database changes)');
    log('  --batch-size=N         Process N tokens at a time (default: 100)');
    log('  --help, -h             Show this help message');
    log('');
    log('Environment Variables:');
    log('  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL');
    log('  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anonymous key');
    log('  ENCRYPTION_MASTER_KEY         Master encryption key (optional)');
    log('  ENCRYPTION_SALT               Encryption salt (optional)');
    log('');
    log('Examples:');
    log('  node scripts/migrate-tokens-to-encryption.js');
    log('  node scripts/migrate-tokens-to-encryption.js --dry-run');
    log('  node scripts/migrate-tokens-to-encryption.js --batch-size=50');
    process.exit(0);
  }
}

// Main execution
async function main() {
  showHelp();
  validateEnvironment();
  await migrateTokens();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Run the migration
if (require.main === module) {
  main().catch(error => {
    logError(`Migration failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  migrateTokens,
  encryptToken,
  getTokensNeedingEncryption
};
