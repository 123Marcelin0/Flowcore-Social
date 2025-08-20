import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl
	if (pathname !== '/' && pathname.endsWith('/')) {
		const url = req.nextUrl.clone()
		url.pathname = pathname.replace(/\/+$/, '')
		return NextResponse.redirect(url)
	}
	return NextResponse.next()
}


