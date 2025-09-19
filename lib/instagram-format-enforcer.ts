// TEMPORARY STUB: Instagram format enforcer without Redis dependencies
// Original functionality disabled during Redis to Postgres migration

export class InstagramFormatEnforcer {
  async validateFormat(mediaUrl: string) {
    console.log('⚠️ Instagram format validation disabled (Redis removed)')
    return {
      valid: true,
      warnings: ['Format validation temporarily disabled during migration']
    }
  }

  async enforceFormat(mediaUrl: string, options: any = {}) {
    console.log('⚠️ Instagram format enforcement disabled (Redis removed)')
    return {
      success: false,
      error: 'Format enforcement temporarily disabled during migration'
    }
  }
}

export const instagramFormatEnforcer = new InstagramFormatEnforcer()