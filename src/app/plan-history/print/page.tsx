/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Task, Staff } from '@/types'

import * as htmlToImage from 'html-to-image'
import Swal from 'sweetalert2'

function PrintComponent() {
  const searchParams = useSearchParams()
  const dateStr = searchParams.get('date') || ''
  const region = searchParams.get('region') || 'ภาคกลาง'

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [staffDetails, setStaffDetails] = useState<Record<string, Staff>>({})
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([])
  const [regionConfig, setRegionConfig] = useState<{staffName: string, startTime: string, carPlate: string} | null>(null)

  useEffect(() => {
    if (!dateStr) return

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/history?date=${dateStr}`)
        if (res.ok) {
          const data = await res.json() as any
          const snapshot = JSON.parse(data.snapshotData)
          
          const allTasks = snapshot.tasks || []
          const allStaffs = snapshot.staffs || []
          
          // Filter staffs by region
          const regionStaffs = allStaffs.filter((s: any) => s.region === region)
          const staffNames = regionStaffs.map((s: any) => s.name)
          
          const filteredTasks = allTasks.filter((t: any) => t.region === region && t.assignee && t.assignee !== 'รอแพลน')
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))

          const staffMap: Record<string, Staff> = {}
          regionStaffs.forEach((s: any) => {
            staffMap[s.name] = s
          })

          setTasks(filteredTasks)
          setStaffDetails(staffMap)
          setSelectedStaffs(staffNames)
        }

        if (region && region !== 'ภาคกลาง') {
          const resConfig = await fetch(`/api/region-config?region=${region}`)
          if (resConfig.ok) {
            const rConfig = await resConfig.json() as any
            setRegionConfig(rConfig)
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error(error)
        setLoading(false)
      }
    }

    fetchData()
  }, [dateStr, region])

  const handleSaveImage = async () => {
    const element = document.getElementById('print-container')
    if (!element) return
    
    const buttons = document.getElementById('print-buttons')
    if (buttons) buttons.style.display = 'none'

    try {
      Swal.fire({
        title: 'กำลังสร้างรูปภาพ...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      window.scrollTo(0, 0)
      const dataUrl = await htmlToImage.toPng(element, { 
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        style: { margin: '0', transform: 'scale(1)', transformOrigin: 'top left' }
      })

      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      if (isIOS && navigator.share) {
        const file = new File([blob], `History_Plan_${dateStr}.png`, { type: 'image/png' })
        try {
          await navigator.share({ files: [file], title: 'ประวัติแพลนงาน' })
          Swal.close()
          return
        } catch (shareErr) {
          console.log('Share API cancelled or failed:', shareErr)
        }
      }

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `History_Plan_${dateStr}.png`
      link.href = blobUrl
      link.click()

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      Swal.close()
    } catch (err) {
      console.error(err)
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างรูปภาพได้', 'error')
    } finally {
      if (buttons) buttons.style.display = 'flex'
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">กำลังโหลดเอกสาร...</div>
  }

  if (!dateStr) {
    return <div className="p-8 text-center text-red-500 font-bold">ไม่พบวันที่</div>
  }

  const actualDate = dateStr.includes('_') ? dateStr.split('_')[1] : dateStr
  const displayStart = new Date(actualDate).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const headerTitle = `📜 ประวัติแพลนงาน ${displayStart} 📜`

  return (
    <div className="bg-slate-100 min-h-screen py-4">
      <div id="print-buttons" className="max-w-4xl mx-auto mb-4 flex justify-end gap-2 px-8 print:hidden">
        <button onClick={() => window.print()} className="bg-black hover:bg-gray-800 text-amber-400 px-4 py-2 rounded shadow font-bold">
          🖨️ พิมพ์เอกสาร
        </button>
        <button onClick={handleSaveImage} className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded shadow font-bold">
          📸 เซฟเป็นรูปภาพ
        </button>
      </div>

      <div id="print-container" className="bg-white p-6 sm:p-8 text-black font-sans w-full max-w-[794px] mx-auto printable-area">
        <div className="mb-6 border-b-2 border-gray-300 pb-4 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{headerTitle}</h2>
          <p className="text-sm text-gray-500">พื้นที่: {region}</p>
        </div>

        {region !== 'ภาคกลาง' && regionConfig && (
          <div className="mb-6 p-4 rounded-lg border-2 border-amber-300 bg-amber-50 text-center shadow-sm">
            <h3 className="text-lg font-bold text-amber-900 mb-2">📌 ข้อมูลหลักประจำ{region}</h3>
            <div className="flex justify-center items-center gap-8 text-md font-bold text-slate-800">
              <span>👤 ผู้รับงาน: <span className="text-amber-800">{regionConfig.staffName || '-'}</span></span>
              <span>⏰ เวลาออก: <span className="text-amber-800">{regionConfig.startTime || '-'}</span></span>
              <span>🚗 รถที่ใช้: <span className="text-amber-800">{regionConfig.carPlate || '-'}</span></span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {selectedStaffs.map((staffName, idx) => {
            const staffInfo = staffDetails[staffName] || { startTime: '', carPlate: '' }
            const staffTasks = tasks.filter(t => t.assignee === staffName)

            return (
              <div key={staffName} className="pb-4">
                {idx > 0 && <div className="my-6 border-t-2 border-dashed border-gray-300"></div>}
                
                <div className="mb-3 p-2 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div className="text-sm font-bold flex items-center gap-4 text-amber-900">
                    <span className="text-base">
                      {region === 'ภาคกลาง' ? `👤 ${staffName}` : `📅 ${staffName}`}
                    </span>
                    {staffInfo.startTime && <span>⏰ เริ่มงาน: {staffInfo.startTime}</span>}
                    {staffInfo.carPlate && <span>🚗 รถ: {staffInfo.carPlate}</span>}
                  </div>
                </div>

                <div className="space-y-3 pl-2">
                  {staffTasks.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">ไม่มีแผนงานสำหรับพนักงานนี้</div>
                  ) : (
                    staffTasks.map((t, i) => {
                      /* eslint-disable */
                      const detailsHtml = t.details && t.details.includes('เข้าสาขา') 
                        ? (() => {
                            const parts = t.details.split('เข้าสาขา')
                            return <>{parts[0]}<span className="font-bold text-black bg-yellow-200 px-1">เข้าสาขา</span>{parts[1]}</>
                          })()
                        : <>{t.details}</>
                      const locationHtml = <>{t.location}</>
                      /* eslint-enable */

                      return (
                        <div key={t.id} className="leading-relaxed text-sm text-black break-words whitespace-pre-wrap">
                          <span>{i + 1}. </span>
                          {detailsHtml}

                          {t.lift && (
                            <span className="font-bold text-black bg-[#FF99CC] px-1 rounded ml-1">
                              🛵 ยกรถ {t.liftPlate || ''}
                            </span>
                          )}

                          {t.customerName && <span> 👦 {t.customerName}</span>}
                          {t.phone && <span className="font-bold text-black ml-1">📱 {t.phone}</span>}
                          {t.location && <span> 📍 {locationHtml}</span>}
                          {t.time && <span className="text-red-600 ml-1">⏰ {t.time}</span>}
                          {t.admin && <span className="text-gray-400 ml-1">Adm: {t.admin}</span>}

                          {(t.driverName || t.startTime || t.car) && (
                            <div className="ml-4 mt-0.5 text-xs text-gray-700">
                              {t.driverName && <span className="mr-3">👤 {t.driverName}</span>}
                              {t.startTime && <span className="mr-3">⏰ เริ่มงาน: {t.startTime}</span>}
                              {t.car && <span>🚗 รถ: {t.car}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <style jsx global>{`
          @media print {
            body { background: white !important; padding: 0 !important; }
            .printable-area { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
            #print-buttons { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function PrintHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">กำลังโหลดเอกสาร...</div>}>
      <PrintComponent />
    </Suspense>
  )
}
