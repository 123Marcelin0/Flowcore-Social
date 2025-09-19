// TEMPORARY STUB: Proxy generator without Redis dependencies
// Original functionality disabled during Redis to Postgres migration

export class ProxyGenerator {
  async generateProxy(uploadId: string, options: any = {}) {
    console.log('⚠️ Proxy generation disabled (Redis removed)')
    return {
      success: false,
      error: 'Proxy generation temporarily disabled during migration'
    }
  }

  async queueProxyJob(uploadId: string, options: any = {}) {
    console.log('⚠️ Proxy job queuing disabled (Redis removed)')
    return `mock_proxy_job_${Date.now()}`
  }
}

export const proxyGenerator = new ProxyGenerator()