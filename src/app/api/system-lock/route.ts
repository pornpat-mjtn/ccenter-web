import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const LOCK_KEY = 'SystemLocked_CC'
const LOCK_PASSWORD = 'CC0935199292'

// Only the Refin control panel is allowed to call this cross-domain.
const ALLOWED_ORIGIN = 'https://refin-app.pages.dev'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: LOCK_KEY } })
    const locked = !!setting && setting.value === '1'
    return NextResponse.json({ locked }, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { locked: false, error: String(error) },
      { status: 500, headers: corsHeaders() }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string; locked?: boolean }
    const { password, locked } = body

    if (password !== LOCK_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 401, headers: corsHeaders() }
      )
    }

    await prisma.setting.upsert({
      where: { key: LOCK_KEY },
      update: { value: locked ? '1' : '0' },
      create: { key: LOCK_KEY, value: locked ? '1' : '0' }
    })

    return NextResponse.json({ success: true, locked: !!locked }, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500, headers: corsHeaders() }
    )
  }
}
