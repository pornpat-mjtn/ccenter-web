'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Task, Staff } from '@/types'

import * as htmlToImage from 'html-to-image'
import Swal from 'sweetalert2'

function PrintComponent() {
  const searchParams = useSearchParams()
  const startDateStr = searchParams.get('startDate') || ''
  const endDateStr = searchParams.get('endDate') || ''
  const staffsStr = searchParams.get('staffs') || ''
  const region = searchParams.get('region') || 'ภาคกลาง'
  const selectedStaffs = staffsStr ? staffsStr.split(',') : []

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [staffDetails, setStaffDetails] = useState<Record<string, Staff>>({})
  const [regionConfig, setRegionConfig] = useState<{staffName: string, startTime: string, carPlate: string} | null>(null)

  useEffect(() => {
    if (!startDateStr || !endDateStr || selectedStaffs.length === 0) return

    const fetchData = async () => {
      try {
        const fetchPromises: Promise<any>[] = [
          fetch(`/api/tasks`),
          fetch(`/api/staff`)
        ]
        
        if (region && region !== 'ภาคกลาง') {
          fetchPromises.push(fetch(`/api/region-config?region=${region}`))
        }

        const responses = await Promise.all(fetchPromises)
        const allTasks: Task[] = await responses[0].json()
        const allStaff: Staff[] = await responses[1].json()
        
        if (region && region !== 'ภาคกลาง' && responses[2]) {
          const rConfig = await responses[2].json()
          setRegionConfig(rConfig)
        }

        const startFormatted = new Date(startDateStr).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
        const endFormatted = new Date(endDateStr).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })

        const filteredTasks = allTasks.filter(t => {
          if (!t.assignee || !selectedStaffs.includes(t.assignee)) return false
          const taskDateFormatted = new Date(t.date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
          return taskDateFormatted >= startFormatted && taskDateFormatted <= endFormatted
        }).sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          if (dateA !== dateB) return dateA - dateB
          return (a.order || 0) - (b.order || 0)
        })

        const staffMap: Record<string, Staff> = {}
        allStaff.forEach(s => {
          staffMap[s.name] = s
        })

        setTasks(filteredTasks)
        setStaffDetails(staffMap)
        setLoading(false)
      } catch (error) {
        console.error(error)
      }
    }

    fetchData()
  }, [startDateStr, endDateStr, staffsStr])

  const handleSaveImage = async () => {
    const element = document.getElementById('print-container')
    if (!element) return
    
    // Hide buttons before capture
    const buttons = document.getElementById('print-buttons')
    if (buttons) buttons.style.display = 'none'

    try {
      Swal.fire({
        title: 'กำลังสร้างรูปภาพ...',
        text: 'กรุณารอสักครู่ (หากข้อมูลยาวมากอาจใช้เวลา 5-10 วินาที)',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      // Wait a moment for UI to update and fonts to render
      await new Promise(resolve => setTimeout(resolve, 500))

      window.scrollTo(0, 0)
      const dataUrl = await htmlToImage.toPng(element, { 
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        style: {
          margin: '0',
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      })

      // Convert Data URL to Blob (avoids crashes on large files)
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      // Try iOS Native Share first
      if (isIOS && navigator.share) {
        const file = new File([blob], `Plan_${startDateStr}.png`, { type: 'image/png' })
        try {
          await navigator.share({
            files: [file],
            title: 'แพลนงาน'
          })
          Swal.close()
          return
        } catch (shareErr) {
          console.log('Share API cancelled or failed:', shareErr)
        }
      }

      // Fallback for PC / Android / iOS if Share fails
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `Plan_${startDateStr}.png`
      link.href = blobUrl
      link.click()

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      Swal.close()
    } catch (err) {
      console.error(err)
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง', 'error')
    } finally {
      if (buttons) buttons.style.display = 'flex'
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">กำลังโหลดเอกสาร...</div>
  }

  const displayStart = new Date(startDateStr).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const displayEnd = new Date(endDateStr).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  
  const headerTitleRange = startDateStr === endDateStr 
    ? `🚩 แพลนงาน ${displayStart} 🚩`
    : `🚩 แพลนงานตั้งแต่วัน ${displayStart} ถึง ${displayEnd} 🚩`

  return (
    <div className="bg-slate-100 min-h-screen py-4">
      <div id="print-buttons" className="max-w-4xl mx-auto mb-4 flex justify-end gap-2 px-8 print:hidden">
        <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-sky-400 px-4 py-2 rounded shadow font-bold">
          🖨️ พิมพ์เอกสาร
        </button>
        <button onClick={handleSaveImage} className="bg-sky-500 hover:bg-sky-600 text-black px-4 py-2 rounded shadow font-bold">
          📸 เซฟเป็นรูปภาพ
        </button>
      </div>

      <div id="print-container" className="bg-white p-6 sm:p-8 text-black font-sans w-full max-w-[794px] mx-auto printable-area">
        <div className="mb-6 border-b-2 border-gray-300 pb-4 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{headerTitleRange}</h2>
        </div>

        {region !== 'ภาคกลาง' && regionConfig && (
          <div className="mb-6 p-4 rounded-lg border-2 border-sky-300 bg-sky-50 text-center shadow-sm">
            <h3 className="text-lg font-bold text-sky-900 mb-2">📌 ข้อมูลหลักประจำ{region}</h3>
            <div className="flex justify-center items-center gap-8 text-md font-bold text-slate-800">
              <span>👤 ผู้รับงาน: <span className="text-sky-800">{regionConfig.staffName || '-'}</span></span>
              <span>⏰ เวลาออก: <span className="text-sky-800">{regionConfig.startTime || '-'}</span></span>
              <span>🚗 รถที่ใช้: <span className="text-sky-800">{regionConfig.carPlate || '-'}</span></span>
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
                
                <div className="mb-3 p-2 rounded-lg border border-sky-200 bg-sky-50/50">
                  <div className="text-sm font-bold flex items-center gap-4 text-sky-900">
                    <span className="text-base">
                      {region === 'ภาคกลาง' ? `👤 ${staffName}` : `📅 ${staffName}`}
                    </span>
                    {staffInfo.startTime && <span>⏰ เริ่มงาน: {staffInfo.startTime}</span>}
                    {staffInfo.carPlate && <span>🚗 รถ: {staffInfo.carPlate}</span>}
                  </div>
                </div>

                <div className="space-y-3 pl-2">
                  {staffTasks.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">ไม่มีแผนงานสำหรับช่วงเวลาที่เลือก</div>
                  ) : (
                    staffTasks.map((t, i) => {
                      // Handle conditional highlight for Location/Details
                      let detailsHtml = <>{t.details}</>
                      let locationHtml = <>{t.location}</>

                      if (t.details && t.details.includes('เข้าสาขา')) {
                        const parts = t.details.split('เข้าสาขา')
                        detailsHtml = <>{parts[0]}<span className="font-bold text-black bg-yellow-200 px-1">เข้าสาขา</span>{parts[1]}</>
                      }

                      return (
                        <div key={t.id} className="leading-relaxed text-sm text-black break-words whitespace-pre-wrap">
                          {/* Task details */}
                          <span>{i + 1}. </span>
                          {detailsHtml}

                          {/* Lift icon + text */}
                          {t.lift && (
                            <span className="font-bold text-black bg-[#FF99CC] px-1 rounded ml-1">
                              🛵 ยกรถ {t.liftPlate || ''}
                            </span>
                          )}

                          {/* Customer */}
                          {t.customerName && <span> 👦 {t.customerName}</span>}

                          {/* Phone (moved to be right after Customer, bold text) */}
                          {t.phone && <span className="font-bold text-black ml-1">📱 {t.phone}</span>}

                          {/* Location */}
                          {t.location && <span> 📍 {locationHtml}</span>}

                          {/* Time (red text with clock icon) */}
                          {t.time && <span className="text-red-600 ml-1">⏰ {t.time}</span>}

                          {/* Info field */}
                          {t.info && <span className="text-slate-700 bg-slate-100 border border-slate-200 px-1 rounded ml-1 text-xs">📝 ข้อมูล: {t.info}</span>}

                          {/* Admin */}
                          {t.admin && <span className="text-gray-400 ml-1">Adm: {t.admin}</span>}

                          {/* Inline driver info for Day columns */}
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

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">กำลังโหลดเอกสาร...</div>}>
      <PrintComponent />
    </Suspense>
  )
}
