import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { pin } = await request.json() as any
    
    // Check if ManagerPIN exists, if not, create it
    let setting = await prisma.setting.findUnique({
      where: { key: 'ManagerPIN' }
    })

    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          key: 'ManagerPIN',
          value: '1234'
        }
      })
    }

    if (setting.value === pin) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false }, { status: 401 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: String(error), stack: (error as Error)?.stack }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { currentPin, newPin } = await request.json() as any

    if (!newPin || newPin.length < 4) {
      return NextResponse.json({ success: false, error: 'รหัส PIN ใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' }, { status: 400 })
    }

    let setting = await prisma.setting.findUnique({
      where: { key: 'ManagerPIN' }
    })

    const activePin = setting ? setting.value : '1234'

    if (activePin !== currentPin) {
      return NextResponse.json({ success: false, error: 'รหัส PIN ปัจจุบันไม่ถูกต้อง' }, { status: 400 })
    }

    await prisma.setting.upsert({
      where: { key: 'ManagerPIN' },
      update: { value: newPin },
      create: { key: 'ManagerPIN', value: newPin }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
