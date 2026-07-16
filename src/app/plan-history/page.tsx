/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Calendar, MapPin, ZoomIn, ZoomOut, Bike, Clock, Phone, UserPen, Trash } from 'lucide-react'
import Swal from 'sweetalert2'

const REGIONS = ['ภาคกลาง', 'ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้']

export default function PlanHistory() {
  const router = useRouter()
  const [historyDates, setHistoryDates] = useState<{date: string, createdAt: string}[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [snapshot, setSnapshot] = useState<any>(null)
  
  const [region, setRegion] = useState('ภาคกลาง')
  const [zoom, setZoom] = useState(100)
  const [staffFilter, setStaffFilter] = useState('All')

  useEffect(() => {
    fetchHistoryDates()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadSnapshot(selectedDate)
    } else {
      setSnapshot(null)
    }
  }, [selectedDate])

  const fetchHistoryDates = async () => {
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = await res.json() as any
        setHistoryDates(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadSnapshot = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/history?date=${dateStr}`)
      if (res.ok) {
        const data = await res.json() as any
        const parsed = JSON.parse(data.snapshotData)
        setSnapshot(parsed)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteHistory = async () => {
    if (!selectedDate) return

    const result = await Swal.fire({
      title: 'ลบประวัติแพลนงาน?',
      text: `คุณต้องการลบประวัติของวันที่ ${selectedDate} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/history?date=${selectedDate}`, { method: 'DELETE' })
        if (res.ok) {
          Swal.fire('ลบแล้ว!', 'ลบประวัติเรียบร้อย', 'success')
          setSelectedDate('')
          fetchHistoryDates()
        } else {
          Swal.fire('Error', 'ไม่สามารถลบข้อมูลได้', 'error')
        }
      } catch (e) {
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error')
      }
    }
  }

  const handlePrint = () => {
    if (!selectedDate || !snapshot) {
      Swal.fire('คำเตือน', 'กรุณาเลือกประวัติที่ต้องการ Print', 'warning')
      return
    }
    const query = new URLSearchParams({
      date: selectedDate,
      region: region
    }).toString()

    const printWindow = window.open(`/plan-history/print?${query}`, '_blank')
    if (printWindow) {
      printWindow.focus()
    }
  }

  const getZoomClasses = (zoomLevel: number) => {
    if (zoomLevel <= 70) {
      return {
        colWidth: 'w-56',
        cardPadding: 'p-1.5 gap-1.5',
        fontSize: 'text-[10px]',
        titleSize: 'text-xs',
        avatarSize: 'w-5 h-5 text-[9px]',
        iconSize: 10,
        badgePadding: 'px-1 py-0.5 rounded text-[8px]',
        gapSize: 'gap-2'
      }
    } else if (zoomLevel <= 85) {
      return {
        colWidth: 'w-64',
        cardPadding: 'p-2 gap-2',
        fontSize: 'text-[11px]',
        titleSize: 'text-xs',
        avatarSize: 'w-5.5 h-5.5 text-[10px]',
        iconSize: 11,
        badgePadding: 'px-1.5 py-0.5 rounded text-[9px]',
        gapSize: 'gap-3'
      }
    } else if (zoomLevel <= 100) {
      return {
        colWidth: 'w-72',
        cardPadding: 'p-3 gap-3',
        fontSize: 'text-xs',
        titleSize: 'text-sm',
        avatarSize: 'w-6 h-6 text-xs',
        iconSize: 12,
        badgePadding: 'px-1.5 py-0.5 rounded text-[10px]',
        gapSize: 'gap-4'
      }
    } else {
      return {
        colWidth: 'w-80',
        cardPadding: 'p-4 gap-3.5',
        fontSize: 'text-xs',
        titleSize: 'text-base',
        avatarSize: 'w-7 h-7 text-sm',
        iconSize: 14,
        badgePadding: 'px-2 py-1 rounded text-xs',
        gapSize: 'gap-5'
      }
    }
  }

  const zoomStyle = getZoomClasses(zoom)

  let staffs = snapshot?.staffs || []
  let allTasks = snapshot?.tasks || []
  
  // Filter staffs by region if region is selected, but some tasks might be cross-region. 
  // Manager view usually shows all staffs for that region.
  const regionStaffs = staffs.filter((s: any) => s.region === region)
  
  const columns = ['รอแพลน', ...regionStaffs.map((s: any) => s.name)]
  const filteredColumns = staffFilter === 'All' ? columns : ['รอแพลน', staffFilter]

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc] text-gray-800 font-sans">
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-3 shrink-0 shadow-[0_2px_15px_rgb(0,0,0,0.03)] z-20 sticky top-0 overflow-x-auto w-full">
        <div className="flex justify-between items-center min-w-[1000px] w-full">
          <div className="font-bold text-xl text-gray-800 flex items-center gap-2 shrink-0">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100 mr-2">
              <ArrowLeft size={20} />
            </button>
            <img src="/logo-ccenter.png" alt="C Center" className="w-8 h-8 object-contain" /> 
            C Center <span className="text-sm font-normal text-sky-500 ml-1">Plan History</span>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            <div className="flex items-center bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 gap-2 shrink-0">
              <span className="text-sm text-blue-600 font-bold">เลือกวันที่ (Snapshot):</span>
              <select 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-bold bg-white border border-gray-200 rounded px-2 py-1 outline-none text-gray-700"
              >
                <option value="">-- กรุณาเลือก --</option>
                {historyDates.map(h => (
                  <option key={h.date} value={h.date}>
                    {new Date(h.date).toLocaleDateString('th-TH')}
                  </option>
                ))}
              </select>
            </div>

            {selectedDate && (
              <button onClick={handleDeleteHistory} className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0" title="ลบประวัติ">
                <Trash size={15} /> ลบประวัติ
              </button>
            )}

            <div className="flex items-center bg-slate-50 rounded-lg border px-1 py-1 shrink-0">
              <button onClick={() => setZoom(Math.max(60, zoom - 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={16} /></button>
              <span className="text-xs font-bold w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(120, zoom + 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={16} /></button>
            </div>

            <button onClick={handlePrint} disabled={!selectedDate || !snapshot} className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${(!selectedDate || !snapshot) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-[0_4px_10px_rgb(251,191,36,0.2)] hover:-translate-y-0.5'}`}>
              <Printer size={15} /> ปริ้นท์ ประวัติ
            </button>
          </div>
        </div>
      </nav>

      {/* Region Selector */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-2.5 flex items-center gap-2 flex-wrap shrink-0 shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-10">
        <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><MapPin size={14} /> พื้นที่:</span>
        <div className="flex gap-2">
          {REGIONS.map(reg => (
            <button 
              key={reg}
              onClick={() => {
                setRegion(reg)
                setStaffFilter('All')
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${region === reg ? 'bg-gradient-to-r from-gray-900 to-black text-amber-400 font-bold shadow-[0_4px_10px_rgb(0,0,0,0.15)] transform -translate-y-0.5' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {reg}
            </button>
          ))}
        </div>
        <div className="ml-4 flex items-center bg-slate-50 border rounded-lg px-2 py-1 gap-1 shrink-0">
          <span className="text-xs text-slate-500 font-medium">พนักงาน:</span>
          <select 
            value={staffFilter} 
            onChange={(e) => setStaffFilter(e.target.value)}
            className="text-xs font-bold bg-transparent outline-none py-1"
          >
            <option value="All">ดูทุกคน</option>
            {regionStaffs.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <main className="flex-1 overflow-x-auto p-6 bg-[#f8f9fc]">
        {!selectedDate ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-lg font-medium">
            กรุณาเลือกวันที่ด้านบน เพื่อดูประวัติแพลนงาน
          </div>
        ) : !snapshot ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-lg font-medium">
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <div className={`flex ${zoomStyle.gapSize} h-full items-start min-w-max pb-4`}>
            {filteredColumns.map(colId => {
              const colTasks = allTasks.filter((t: any) => 
                (t.region === region || colId !== 'รอแพลน') &&
                (t.assignee === colId || (colId === 'รอแพลน' && (!t.assignee || t.assignee === 'รอแพลน')))
              ).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              
              const colLiftTasksCount = colTasks.filter((t: any) => t.lift).length
              const staff = regionStaffs.find((s: any) => s.name === colId)
              const isSingleStaff = staffFilter !== 'All'
              
              return (
                <div key={colId} className={`${colId === 'รอแพลน' ? zoomStyle.colWidth : (isSingleStaff ? 'flex-1 min-w-[320px]' : zoomStyle.colWidth)} shrink-0 flex flex-col max-h-full`}>
                  <div className={`p-4 rounded-t-2xl border-t-4 shadow-[0_4px_15px_rgb(0,0,0,0.03)] font-bold flex justify-between items-center ${colId === 'รอแพลน' ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-400 text-amber-900' : 'bg-gradient-to-b from-white to-gray-50/50 border-gray-300 text-gray-800'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`truncate ${zoomStyle.titleSize} flex items-center gap-1`}>
                          {colId}
                          {colId !== 'รอแพลน' && colLiftTasksCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-orange-600 font-bold ml-1">
                              <Bike size={zoomStyle.iconSize + 2} /> {colLiftTasksCount}
                            </span>
                          )}
                        </span>
                      </div>
                      {staff && (
                        <div className="text-[10px] text-gray-500 font-normal mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                          {staff.startTime ? <span className="flex items-center gap-0.5"><Clock size={10} /> {staff.startTime}</span> : <span>ยังไม่ได้ตั้งค่าเริ่มงาน</span>}
                          {staff.carPlate && <span className="flex items-center gap-0.5"><Bike size={10} /> {staff.carPlate}</span>}
                        </div>
                      )}
                    </div>
                    <span className="bg-white/80 backdrop-blur border border-gray-100 px-2.5 rounded-full text-xs py-1 shadow-sm ml-2 shrink-0">{colTasks.length}</span>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto p-2 bg-gray-50/50 border-x border-b border-gray-200 rounded-b-2xl shadow-inner min-h-[150px]`}>
                    {colTasks.map((task: any, index: number) => {
                      const hasLift = task.lift || task.liftPlate
                      return (
                        <div key={task.id} className={`${zoomStyle.cardPadding} rounded-2xl border mb-2 flex text-left transition-shadow duration-200 ${hasLift ? 'border-amber-100 bg-gradient-to-br from-amber-50/50 to-white' : 'border-gray-100 bg-white'} shadow-[0_2px_12px_rgb(0,0,0,0.04)] ${zoomStyle.fontSize} text-slate-600 relative overflow-hidden group`}>
                          <div className={`absolute top-0 left-0 bottom-0 w-1 ${hasLift ? 'bg-amber-400' : 'bg-gray-300'}`}></div>
                          
                          <div className="shrink-0 pt-0.5 ml-1">
                            <div className={`bg-slate-100 border border-slate-200 text-slate-500 font-bold ${zoomStyle.avatarSize} rounded-md flex items-center justify-center shadow-sm`}>
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className={`font-bold text-slate-800 ${zoomStyle.titleSize} truncate mb-1`} title={task.customerName || ''}>
                                {task.customerName || <span className="text-slate-400 italic">ไม่ระบุชื่อลูกค้า</span>}
                              </div>
                            </div>

                            {hasLift && (
                              <div className={`text-[10px] text-orange-700 bg-orange-100/60 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1 mb-1.5 font-bold`}>
                                <Bike size={11} /> ยกรถ {task.liftPlate || ''}
                              </div>
                            )}

                            <div className="font-bold text-red-650 mb-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" /> {task.details || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                            </div>

                            <div className="mb-1 flex items-center gap-1">
                              <Phone size={zoomStyle.iconSize} className="text-slate-400 shrink-0" /> {task.phone || <span className="text-slate-400 italic">ไม่มีเบอร์โทร</span>}
                            </div>

                            <div className="mb-1 flex items-start gap-1">
                              <MapPin size={zoomStyle.iconSize} className="text-slate-400 shrink-0 mt-0.5" /> 
                              <span className="line-clamp-2" title={task.location || ''}>
                                {task.location || <span className="text-slate-400 italic">ไม่ได้ระบุสถานที่</span>}
                              </span>
                            </div>

                            <div className={`text-blue-800 bg-blue-50/50 border border-blue-100 ${zoomStyle.badgePadding} inline-flex items-center gap-1 mt-1 font-semibold`}>
                              <Calendar size={zoomStyle.iconSize} /> 
                              <span>
                                ภาค: {task.region} | นัดหมาย: {task.date ? new Date(task.date).toLocaleDateString('th-TH') : '-'} {task.time || ''}
                              </span>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
                              <UserPen size={12} /> เพิ่มโดย: {task.admin}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-xs font-medium bg-white/50 rounded-xl border border-dashed border-gray-200">
                        ไม่มีงาน
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
