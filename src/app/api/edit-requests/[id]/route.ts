import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action } = await request.json() as any

    if (action === 'approve') {
      const editRequest = await prisma.editRequest.findUnique({
        where: { id }
      })

      if (!editRequest) {
        return NextResponse.json({ error: 'ไม่พบคำขอแก้ไขนี้ในระบบ' }, { status: 404 })
      }

      let requested: any
      try {
        requested = JSON.parse(editRequest.requestedFields)
      } catch {
        return NextResponse.json({ error: 'ข้อมูลคำขอเสียหาย ไม่สามารถ parse JSON ได้' }, { status: 400 })
      }

      // Ensure the task still exists before updating
      const taskExists = await prisma.task.findUnique({
        where: { id: editRequest.taskId }
      })

      if (!taskExists) {
        // Task was deleted, just clean up the edit request
        await prisma.editRequest.delete({ where: { id } })
        return NextResponse.json({ success: true, note: 'งานต้นทางถูกลบไปแล้ว ลบคำขอแก้ไขออก' })
      }

      // Safely convert lift to boolean (could be string "true"/"false" or boolean)
      const liftValue = requested.lift === true || requested.lift === 'true'

      const dateObj = requested.date ? new Date(requested.date) : undefined
      await prisma.task.update({
        where: { id: editRequest.taskId },
        data: {
          date: dateObj,
          region: requested.region || taskExists.region,
          admin: requested.admin || taskExists.admin,
          details: requested.details || taskExists.details,
          customerName: requested.customerName ?? taskExists.customerName,
          phone: requested.phone ?? taskExists.phone,
          location: requested.location ?? taskExists.location,
          time: requested.time ?? taskExists.time,
          lift: liftValue,
          liftPlate: requested.liftPlate ?? taskExists.liftPlate,
          driverName: requested.driverName ?? taskExists.driverName,
          startTime: requested.startTime ?? taskExists.startTime,
          car: requested.car ?? taskExists.car
        }
      })

      // Delete the edit request after merging changes
      await prisma.editRequest.delete({
        where: { id }
      })

      return NextResponse.json({ success: true })
    } else if (action === 'reject') {
      await prisma.editRequest.delete({
        where: { id }
      })
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('EditRequest API Error:', error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
