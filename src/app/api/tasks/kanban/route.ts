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

    // 4. Calculate optimized intermediate order
    let newOrder = 0
    if (otherTasks.length === 0) {
      newOrder = 1000
    } else if (newIndex <= 0) {
      newOrder = otherTasks[0].order - 1000
    } else if (newIndex >= otherTasks.length) {
      newOrder = otherTasks[otherTasks.length - 1].order + 1000
    } else {
      const prevOrder = otherTasks[newIndex - 1].order
      const nextOrder = otherTasks[newIndex].order
      if (nextOrder - prevOrder > 1) {
        newOrder = Math.round((prevOrder + nextOrder) / 2)
      } else {
        // Fallback: re-index everything in the column only when no integer gap exists
        const updatedTasks = [...otherTasks]
        const insertIndex = Math.min(newIndex, otherTasks.length)
        updatedTasks.splice(insertIndex, 0, { id, assignee } as any)
        await prisma.$transaction(
          updatedTasks.map((t, idx) => 
            prisma.task.update({
              where: { id: t.id },
              data: {
                assignee: t.id === id ? assignee : undefined,
                order: (idx + 1) * 1000
              }
            })
          )
        )
        return NextResponse.json({ success: true })
      }
    }

    // 5. Update only the moved task
    await prisma.task.update({
      where: { id },
      data: {
        assignee,
        order: newOrder
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
