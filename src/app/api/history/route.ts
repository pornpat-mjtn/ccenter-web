/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

function getDB() {
  const ctx = getRequestContext()
  return (ctx.env as any).DB
}

// GET all snapshots or specific date snapshot
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  try {
    const db = getDB()

    if (dateStr) {
      const result = await db.prepare('SELECT * FROM PlanSnapshot WHERE date = ?').bind(dateStr).first()
      if (!result) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    const results = await db.prepare('SELECT id, date, createdAt, updatedAt FROM PlanSnapshot ORDER BY date DESC').all()
    return NextResponse.json(results.results)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Upsert snapshot
export async function POST(request: Request) {
  try {
    const data = await request.json() as any
    const { date, snapshotData } = data

    if (!date || !snapshotData) {
      return NextResponse.json({ error: 'Missing date or snapshotData' }, { status: 400 })
    }

    const db = getDB()
    const now = new Date().toISOString()

    // Check if exists
    const existing = await db.prepare('SELECT id FROM PlanSnapshot WHERE date = ?').bind(date).first()

    if (existing) {
      // Update
      await db.prepare('UPDATE PlanSnapshot SET snapshotData = ?, updatedAt = ? WHERE date = ?')
        .bind(snapshotData, now, date).run()
    } else {
      // Insert
      const id = crypto.randomUUID()
      await db.prepare('INSERT INTO PlanSnapshot (id, date, snapshotData, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
        .bind(id, date, snapshotData, now, now).run()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Delete a snapshot by date
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  try {
    const db = getDB()
    await db.prepare('DELETE FROM PlanSnapshot WHERE date = ?').bind(dateStr).run()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
