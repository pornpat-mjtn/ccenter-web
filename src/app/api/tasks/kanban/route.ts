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

    // 1. Get all tasks in the target assignee's column, sorted by current order
    const tasksInColumn = await prisma.task.findMany({
      where: { assignee },
      orderBy: { order: 'asc' }
    })

    // 2. Remove the task being moved from this list (if it's already in the same column)
    const otherTasks = tasksInColumn.filter(t => t.id !== id)

    // 3. Insert the task being moved at the exact newIndex requested by the frontend
    // If newIndex is larger than the array, it will be placed at the end.
    const insertIndex = Math.min(newIndex, otherTasks.length)
    otherTasks.splice(insertIndex, 0, { id, assignee } as any)

    // 4. Update the task itself with the new assignee (if it changed) and update the order of all affected tasks
    await prisma.$transaction(
      otherTasks.map((t, idx) => 
        prisma.task.update({
          where: { id: t.id },
          data: {
            assignee: t.id === id ? assignee : undefined,
            order: idx * 1000 // Give a spaced out order to allow simple insertions later if needed
          }
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
