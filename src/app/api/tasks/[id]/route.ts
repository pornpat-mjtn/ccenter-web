import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    try {
      await prisma.task.delete({
        where: { id }
      })
    } catch (e: any) {
      if (e.code !== 'P2025') throw e;
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
