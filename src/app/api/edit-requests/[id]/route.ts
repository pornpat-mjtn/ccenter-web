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
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }

      const requested = JSON.parse(editRequest.requestedFields)

      // Ensure the task still exists before updating
      const taskExists = await prisma.task.findUnique({
        where: { id: editRequest.taskId }
      })

      if (taskExists) {
        const dateObj = requested.date ? new Date(requested.date) : undefined
        await prisma.task.update({
          where: { id: editRequest.taskId },
          data: {
            date: dateObj,
            region: requested.region,
            admin: requested.admin,
            details: requested.details,
            customerName: requested.customerName,
            phone: requested.phone,
            location: requested.location,
            time: requested.time,
            lift: requested.lift,
            liftPlate: requested.liftPlate,
            driverName: requested.driverName,
            startTime: requested.startTime,
            car: requested.car
          }
        })
      }

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
    console.error(error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 })
  }
}
