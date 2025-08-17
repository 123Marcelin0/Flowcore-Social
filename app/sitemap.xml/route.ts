import { NextResponse } from 'next/server'

export async function GET() {
	const urls = [
		'/',
		'/dashboard',
		'/calendar',
		'/assistant',
		'/ideas',
		'/settings',
		'/ai-studio',
		'/ai-studio/interior-design',
		'/ai-studio/image-generation',
		'/ai-studio/video-edit',
		'/ai-studio/video-merger',
		'/ai-studio/video-editor',
		'/ai-studio/content-create'
	]
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${u}</loc></url>`).join('')}</urlset>`
	return new NextResponse(body, { headers: { 'Content-Type': 'application/xml' } })
}