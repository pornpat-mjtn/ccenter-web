import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('manager_token')
  const { pathname } = request.nextUrl
  const method = request.method

  // 1. Protect Manager & Plan History Pages
  if (pathname.startsWith('/manager') || pathname.startsWith('/plan-history')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 2. Protect API Routes
  if (pathname.startsWith('/api/')) {
    let requiresAuth = false

    // Endpoints that are completely restricted to managers
    if (
      pathname.startsWith('/api/history') ||
      pathname.startsWith('/api/tasks/kanban') ||
      pathname.startsWith('/api/region-config') ||
      pathname.startsWith('/api/seed')
    ) {
      requiresAuth = true
    }

    // Endpoints with mixed access
    if (pathname.startsWith('/api/auth') && method === 'PUT') {
      requiresAuth = true // Changing PIN requires auth
    }

    if (pathname.startsWith('/api/staff') && method !== 'GET') {
      requiresAuth = true // Public can GET staff list, but only Manager can POST/PUT/DELETE
    }

    if (pathname.startsWith('/api/tasks') && !pathname.startsWith('/api/tasks/kanban')) {
      if (method === 'DELETE' || method === 'PUT') {
        requiresAuth = true // Public can GET and POST (create) tasks, Manager can DELETE/PUT
      }
    }

    if (pathname.startsWith('/api/edit-requests')) {
      if (method !== 'POST') {
        requiresAuth = true // Public can POST request, Manager can GET/DELETE/PUT
      }
    }

    // Return 401 Unauthorized for API requests
    if (requiresAuth && !token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/manager/:path*', '/plan-history/:path*', '/api/:path*']
}
