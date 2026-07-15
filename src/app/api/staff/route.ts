import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region')

  try {
    if (region && region !== 'ภาคกลาง') {
      const days = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์']
      const mockStaffs = days.map((day, idx) => ({
        id: `day-${idx}`,
        name: day,
        region: region,
        startTime: '',
        carPlate: ''
      }))
      return NextResponse.json(mockStaffs)
    }

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

    const created = await prisma.staff.create({
      data: {
        region: data.region,
        name: data.name,
        startTime: '',
        carPlate: ''
      }
    })
    return NextResponse.json({ success: true, staff: created })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
