import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region')
  const assignee = searchParams.get('assignee') // 'รอแพลน' for staff

  try {
    // Auto-cleanup tasks (10:00 AM of appointment date)
    const now = new Date()
    const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const thaiHour = thaiTime.getUTCHours()
    const thaiDateStr = thaiTime.toISOString().split('T')[0]

    const allTasks = await prisma.task.findMany({
      where: { assignee: { not: 'รอแพลน' } }
    })

    const toDeleteIds = allTasks.filter((t: any) => {
      const taskDateStr = new Date(t.date).toISOString().split('T')[0]
      if (taskDateStr < thaiDateStr) return true // Past dates
      // if (taskDateStr === thaiDateStr && thaiHour >= 10) return true // Disabled: Prevents today's tasks from disappearing after 10 AM
      return false
    }).map((t: any) => t.id)

    if (toDeleteIds.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: toDeleteIds } }
      })
    }

    let whereClause: any = {}
    
    if (region) {
      whereClause.region = region
    }
    if (assignee !== null) {
      whereClause.assignee = assignee
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { order: 'asc' }
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as any
    const dateObj = new Date(data.date)

    if (data.id) {
      const updated = await prisma.task.update({
        where: { id: data.id },
        data: {
          date: dateObj,
          region: data.region,
          admin: data.admin,
          details: data.details,
          customerName: data.customerName,
          phone: data.phone,
          location: data.location,
          time: data.time,
          lift: data.lift,
          liftPlate: data.liftPlate,
          driverName: data.driverName,
          startTime: data.startTime,
          car: data.car,
          info: data.info
        }
      })
      return NextResponse.json({ success: true, task: updated })
    } else {
      // Give every new card its own slot at the bottom of "รอแพลน".
      // Creating them all with order 0 left the column full of ties, and SQLite
      // is free to return tied rows in any sequence — cards appeared to shuffle
      // themselves between refreshes.
      let nextOrder = 0
      try {
        const waiting = await prisma.task.findMany({
          where: { assignee: 'รอแพลน', region: data.region },
          orderBy: { order: 'asc' }
        })
        if (waiting.length > 0) {
          nextOrder = Math.max(...waiting.map((t: any) => t.order || 0)) + 1
        }
      } catch (e) {
        console.error('Could not compute next order, falling back to 0:', e)
      }

      const created = await prisma.task.create({
        data: {
          date: dateObj,
          region: data.region,
          admin: data.admin,
          details: data.details,
          customerName: data.customerName,
          phone: data.phone,
          location: data.location,
          time: data.time,
          lift: data.lift,
          liftPlate: data.liftPlate,
          driverName: data.driverName,
          startTime: data.startTime,
          car: data.car,
          info: data.info,
          assignee: 'รอแพลน',
          order: nextOrder
        }
      })
      return NextResponse.json({ success: true, task: created })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
