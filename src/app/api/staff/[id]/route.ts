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
    
    // Update tasks assignee if name changed using raw SQL for D1 compatibility
    if (data.name && oldStaff.name !== data.name) {
      await prisma.$executeRaw`UPDATE Task SET assignee = ${data.name} WHERE assignee = ${oldStaff.name}`
    }
    
    return NextResponse.json({ success: true, staff: updated })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })

    // Reset tasks assigned to this staff back to 'รอแพลน' to prevent orphaned tasks
    await prisma.$executeRaw`UPDATE Task SET assignee = 'รอแพลน' WHERE assignee = ${staff.name}`

    // Delete the staff
    await prisma.staff.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
