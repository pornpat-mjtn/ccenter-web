import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function PUT(request: Request) {
  try {
    const data = await request.json() as any
    // data is an array of { id, assignee, order }
    
    // Perform bulk updates in a transaction
    const updates = data.map((update: any) => 
      prisma.task.update({
        where: { id: update.id },
        data: {
          assignee: update.assignee,
          order: update.order
        }
      })
    )
    
    await prisma.$transaction(updates)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
