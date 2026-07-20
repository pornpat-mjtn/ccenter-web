import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const days = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์']
    const regions = ['ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้']
    let createdCount = 0

    for (const region of regions) {
      for (const day of days) {
        const name = `(${region}) ${day}`
        
        const exists = await prisma.staff.findUnique({
          where: { name }
        })

        if (!exists) {
          await prisma.staff.create({
            data: {
              name,
              region,
              startTime: '',
              carPlate: ''
            }
          })
          createdCount++
        }
      }
    }

    return NextResponse.json({ success: true, created: createdCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
