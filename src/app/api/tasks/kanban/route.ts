import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

type OrderUpdate = { id: string; assignee: string; order: number }

/**
 * PUT /api/tasks/kanban
 *
 * Payload (current): an array of the FULL new ordering for every affected column
 *   [{ id, assignee, order }, ...]
 * The server writes exactly what the client sends — it does not compute ordering
 * itself. This keeps the board on screen and the database perfectly in sync,
 * which is what stops cards from jumping back after a refresh.
 *
 * Payload (legacy): { id, assignee, newIndex } — still supported so that browser
 * tabs running an older bundle keep working until they reload.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as any

    const updates: OrderUpdate[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.updates)
        ? body.updates
        : []

    if (updates.length > 0) {
      const clean = updates.filter(
        (u) => u && typeof u.id === 'string' && typeof u.order === 'number'
      )

      if (clean.length === 0) {
        return NextResponse.json({ error: 'No valid updates supplied' }, { status: 400 })
      }

      // One batched, atomic write for the whole column — not one round trip
      // per card. See task.updateOrders in src/lib/db.ts.
      await prisma.task.updateOrders(
        clean.map((u) => ({
          id: u.id,
          assignee: u.assignee ?? 'รอแพลน',
          order: u.order
        }))
      )

      return NextResponse.json({ success: true, updated: clean.length })
    }

    // ---- Legacy single-card payload -------------------------------------
    const id = body?.id
    const assignee = body?.assignee
    const newIndex = body?.newIndex

    if (!id || typeof newIndex !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const tasksInColumn = await prisma.task.findMany({
      where: { assignee, region: task.region },
      orderBy: { order: 'asc' }
    })

    const rest = tasksInColumn.filter((t: any) => t.id !== id)
    const insertAt = Math.max(0, Math.min(newIndex, rest.length))
    const reordered = [...rest]
    reordered.splice(insertAt, 0, { id, assignee } as any)

    await prisma.task.updateOrders(
      reordered.map((t: any, idx: number) => ({
        id: t.id,
        assignee: t.id === id ? assignee : t.assignee,
        order: idx
      }))
    )

    return NextResponse.json({ success: true, updated: reordered.length })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
