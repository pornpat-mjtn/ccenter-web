import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

const LOCK_KEY = 'SystemLocked_CC'

const LOCK_HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ระบบไม่พร้อมใช้งาน</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #ffffff; color: #333333;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center; padding: 24px;
  }
  p { font-size: 18px; line-height: 1.7; }
</style>
</head>
<body>
  <p>ไม่สามารถเข้าใช้งานระบบได้ในขณะนี้<br />กรุณาติดต่อผู้ดูแลระบบ</p>
</body>
</html>`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isSystemLocked(): Promise<boolean> {
  try {
    const ctx = getRequestContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (ctx?.env as any)?.DB
    if (!db) return false
    const row = await db.prepare('SELECT value FROM Setting WHERE key = ?').bind(LOCK_KEY).first()
    return !!row && row.value === '1'
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // 0. System lock check — applies to everything except the lock-control
  // API itself, which must always stay reachable so it can be unlocked.
  if (!pathname.startsWith('/api/system-lock')) {
    const locked = await isSystemLocked()
    if (locked) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'SYSTEM_LOCKED' }, { status: 503 })
      }
      return new NextResponse(LOCK_HTML, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    }
  }

  const token = request.cookies.get('manager_token')

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
      // A plain "Unauthorized" gave the manager no idea what to do. The real
      // situation is almost always an expired session on a tab left open.
      return NextResponse.json(
        {
          error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
          code: 'SESSION_EXPIRED'
        },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png).*)'
  ]
}
