import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export function middleware(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith('/login')) {
		return NextResponse.next()
	}

	const token = request.cookies.get('auth_token')?.value

	if (!token) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	try {
		verify(token, JWT_SECRET)
		return NextResponse.next()
	} catch (error) {
		return NextResponse.redirect(new URL('/login', request.url))
	}
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
