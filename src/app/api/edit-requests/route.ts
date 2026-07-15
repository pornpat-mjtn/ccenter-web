import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function GET() {
  try {
    const pendingRequests = await prisma.editRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(pendingRequests)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as any
    const { taskId, originalFields, requestedFields, admin } = data

    if (!taskId || !originalFields || !requestedFields || !admin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const editRequest = await prisma.editRequest.create({
      data: {
        taskId,
        originalFields: JSON.stringify(originalFields),
        requestedFields: JSON.stringify(requestedFields),
        admin,
        status: 'PENDING'
      }
    })

    return NextResponse.json({ success: true, editRequest })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
