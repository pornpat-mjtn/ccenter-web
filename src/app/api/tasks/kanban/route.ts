import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function PUT(request: Request) {
  try {
    const data = await request.json() as { id: string, assignee: string, newIndex: number }
    const { id, assignee, newIndex } = data
    
    if (!id || typeof newIndex !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch the dragged task to obtain its date
    const task = await prisma.task.findUnique({
      where: { id }
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    const targetDate = task.date

    // 2. Get all tasks in the target assignee's column with the same date, sorted by current order
    const tasksInColumn = await prisma.task.findMany({
      where: { 
        assignee,
        date: targetDate
      },
      orderBy: { order: 'asc' }
    })

    // 3. Remove the task being moved from this list (if it's already in the same column and same date)
    const otherTasks = tasksInColumn.filter(t => t.id !== id)

    // 4. Insert the task being moved at the exact newIndex requested by the frontend
    const insertIndex = Math.min(newIndex, otherTasks.length)
    otherTasks.splice(insertIndex, 0, { id, assignee } as any)

    // 5. Update the task itself with the new assignee (if it changed) and update the order of all affected tasks
    await prisma.$transaction(
      otherTasks.map((t, idx) => 
        prisma.task.update({
          where: { id: t.id },
          data: {
            assignee: t.id === id ? assignee : undefined,
            order: idx * 1000
          }
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
