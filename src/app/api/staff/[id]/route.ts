import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json() as any

    const oldStaff = await prisma.staff.findUnique({ where: { id } })
    if (!oldStaff) {
      return NextResponse.json(
        { error: 'ไม่พบพนักงานคนนี้ (อาจถูกลบไปแล้ว) กรุณากดอัปเดตงานแล้วลองใหม่' },
        { status: 404 }
      )
    }

    const newName = typeof data.name === 'string' ? data.name.trim() : undefined
    const isRenaming = newName !== undefined && newName !== oldStaff.name

    if (newName !== undefined && !newName) {
      // Blank names are accepted by the database but orphan every card the
      // person is holding — no column matches, so the cards vanish.
      return NextResponse.json({ error: 'ชื่อพนักงานต้องไม่เว้นว่าง' }, { status: 400 })
    }

    if (isRenaming) {
      // Staff.name is UNIQUE across the whole table (Task.assignee stores the
      // name, not an id), so a clash used to surface as a raw English database
      // error that meant nothing to the person reading it.
      const clash = await prisma.staff.findUnique({ where: { name: newName } })
      if (clash && clash.id !== id) {
        const where =
          clash.region === oldStaff.region
            ? `ใน${clash.region}`
            : `ในภาคอื่น (${clash.region})`
        return NextResponse.json(
          { error: `มีพนักงานชื่อ "${newName}" อยู่แล้ว${where} กรุณาใช้ชื่ออื่น` },
          { status: 409 }
        )
      }

      // Rename the person and every card they hold in a single transaction
      await prisma.staff.renameWithTasks(id, oldStaff.name, newName)
    }

    // Shift/car settings are independent of the name and safe to write on their own
    if (data.startTime !== undefined || data.carPlate !== undefined) {
      await prisma.staff.update({
        where: { id },
        data: {
          startTime: data.startTime !== undefined ? data.startTime : undefined,
          carPlate: data.carPlate !== undefined ? data.carPlate : undefined
        }
      })
    }

    const updated = await prisma.staff.findUnique({ where: { id } })
    return NextResponse.json({ success: true, staff: updated })
  } catch (error: any) {
    console.error(error)
    const message = String(error?.message || '')
    if (message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'ชื่อนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'ไม่สามารถบันทึกข้อมูลพนักงานได้' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff) {
      // Most often the list on screen is stale (deleted in another tab, or the
      // button was double-clicked). Nothing is wrong, so say so plainly.
      return NextResponse.json(
        { error: 'ไม่พบพนักงานคนนี้ (อาจถูกลบไปแล้ว) กรุณากดอัปเดตงานแล้วลองใหม่' },
        { status: 404 }
      )
    }

    // Hand the cards back to 'รอแพลน' so none of them are left orphaned
    await prisma.$executeRaw`UPDATE Task SET assignee = 'รอแพลน' WHERE assignee = ${staff.name}`

    await prisma.staff.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: 'ไม่สามารถลบพนักงานได้' }, { status: 500 })
  }
}
