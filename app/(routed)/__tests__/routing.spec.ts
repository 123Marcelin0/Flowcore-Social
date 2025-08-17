import { describe, it, expect } from 'vitest'
import { ROUTES } from '@/src/routes/manifest'
import plan from '@/docs/ROUTE_PLAN.json'

describe('Route Manifest', () => {
	it('has default route', () => {
		expect(ROUTES.defaultRoute).toBe('/dashboard')
	})
	it('primary group contains core pages', () => {
		const primary = ROUTES.groups.find(g => g.id === 'primary')!
		const paths = new Set(primary.routes.map(r => r.path))
		expect(paths.has('/dashboard')).toBe(true)
		expect(paths.has('/calendar')).toBe(true)
		expect(paths.has('/ai-studio')).toBe(true)
	})
	it('json plan matches ts manifest group counts', () => {
		expect(plan.groups.length).toBe(ROUTES.groups.length)
	})
})