import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region')

  try {
    let whereClause: any = {}
    if (region) {
      whereClause.region = region
    }

    const staffs = await prisma.staff.findMany({
      where: whereClause
    })
    return NextResponse.json(staffs)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as any
    const name = typeof data.name === 'string' ? data.name.trim() : ''

    // An empty name is accepted by the database but breaks the board: no
    // column can match it, so every card assigned to that person disappears.
    if (!name) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อพนักงาน' },
        { status: 400 }
      )
    }

    // Staff.name carries a UNIQUE index across the WHOLE table, not per region,
    // because Task.assignee stores the name rather than an id. Without this
    // check the insert fails deep in the database and the manager just sees
    // "Internal Server Error" with no clue that the name is the problem.
    const existing = await prisma.staff.findUnique({ where: { name } })
    if (existing) {
      const where =
        existing.region === data.region
          ? `ใน${existing.region}`
          : `ในภาคอื่น (${existing.region})`
      return NextResponse.json(
        { error: `มีพนักงานชื่อ "${name}" อยู่แล้ว${where} กรุณาใช้ชื่ออื่น` },
        { status: 409 }
      )
    }

    const created = await prisma.staff.create({
      data: {
        region: data.region,
        name,
        startTime: '',
        carPlate: ''
      }
    })
    return NextResponse.json({ success: true, staff: created })
  } catch (error: any) {
    console.error(error)
    const message = String(error?.message || '')
    if (message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'ชื่อนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'ไม่สามารถเพิ่มพนักงานได้' }, { status: 500 })
  }
}
