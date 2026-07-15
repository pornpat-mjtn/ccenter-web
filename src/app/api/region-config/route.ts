import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region')

  if (!region) {
    return NextResponse.json({ error: 'Missing region' }, { status: 400 })
  }

  try {
    const key = `RegionHeader_${region}`
    const setting = await prisma.setting.findUnique({ where: { key } })
    
    if (setting) {
      return NextResponse.json(JSON.parse(setting.value))
    } else {
      return NextResponse.json({ staffName: '', startTime: '', carPlate: '' })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json() as any
    const { region, staffName, startTime, carPlate } = data

    if (!region) {
      return NextResponse.json({ error: 'Missing region' }, { status: 400 })
    }

    const key = `RegionHeader_${region}`
    const value = JSON.stringify({ staffName, startTime, carPlate })

    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
