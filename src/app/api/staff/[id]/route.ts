import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json() as any

    const oldStaff = await prisma.staff.findUnique({ where: { id } })
    if (!oldStaff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        startTime: data.startTime !== undefined ? data.startTime : undefined,
        carPlate: data.carPlate !== undefined ? data.carPlate : undefined
      }
    })
    
    // Update tasks assignee if name changed
    if (data.name && oldStaff.name !== data.name) {
      await prisma.task.updateMany({
        where: { assignee: oldStaff.name },
        data: { assignee: data.name }
      })
    }
    
    return NextResponse.json({ success: true, staff: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.staff.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
