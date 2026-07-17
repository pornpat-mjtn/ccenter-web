'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Task, Staff } from '@/types'
import { LogOut, MapPin, ZoomIn, ZoomOut, Printer, Users, Cog, Plus, Trash, Bike, Clock, Phone, UserPen, Calendar, X, Edit, Key, RefreshCw, Save, History } from 'lucide-react'
import Swal from 'sweetalert2'

const REGIONS = ['ภาคกลาง', 'ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้']

export default function ManagerPortal() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [staffs, setStaffs] = useState<Staff[]>([])
  const [region, setRegion] = useState('ภาคกลาง')
  const [zoom, setZoom] = useState(100)
  const [staffFilter, setStaffFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  // Manage Staff Form
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRegion, setNewStaffRegion] = useState('ภาคกลาง')

  // Staff Config Form
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [configStartTime, setConfigStartTime] = useState('')
  const [configCarPlate, setConfigCarPlate] = useState('')

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const offset = tomorrow.getTimezoneOffset() * 60000
    const localISOTime = (new Date(tomorrow.getTime() - offset)).toISOString().slice(0, 10)
    return localISOTime
  }

  // Print Form
  const [printStartDate, setPrintStartDate] = useState(getTomorrowDate())
  const [printEndDate, setPrintEndDate] = useState(getTomorrowDate())
  const [printStaffs, setPrintStaffs] = useState<string[]>([])
  const [selectAllPrint, setSelectAllPrint] = useState(false)

  // Task Edit Form
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskFormData, setTaskFormData] = useState({
    date: getTomorrowDate(), region: 'ภาคกลาง', customerName: '', phone: '',
    details: '', lift: false, liftPlate: '', location: '', time: '', admin: '',
    driverName: '', startTime: '', car: '', info: ''
  })

  // Region Config (for non-Central)
  const [regionConfig, setRegionConfig] = useState({ staffName: '', startTime: '', carPlate: '' })
  const [isRegionConfigModalOpen, setIsRegionConfigModalOpen] = useState(false)
  const [regionConfigForm, setRegionConfigForm] = useState({ staffName: '', startTime: '', carPlate: '' })


  const [isDragging, setIsDragging] = useState(false)
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [isEditRequestsModalOpen, setIsEditRequestsModalOpen] = useState(false)

  const FIELD_LABELS: Record<string, string> = {
    date: 'วันที่นัดหมาย',
    region: 'ภาค/พื้นที่',
    customerName: 'ชื่อลูกค้า',
    phone: 'เบอร์โทร',
    details: 'รายละเอียดงาน',
    lift: 'เคสยกรถ',
    liftPlate: 'ทะเบียนรถยก',
    location: 'สถานที่',
    time: 'ระบุเวลา',
    admin: 'แอดมิน',
    driverName: 'ผู้รับงาน (พนักงาน)',
    startTime: 'เวลาเริ่มงาน',
    car: 'รถที่ใช้',
    info: 'ข้อมูล (รายละเอียดรถ,ไฟแนนซ์,ยอดปิด)'
  }

  const getDiff = (original: any, requested: any) => {
    const diff: string[] = []
    const keys = Array.from(new Set([...Object.keys(original), ...Object.keys(requested)]))
    for (const key of keys) {
      if (key === 'id' || key === 'createdAt' || key === 'assignee' || key === 'order') continue
      const origVal = original[key] === null || original[key] === undefined ? '' : String(original[key])
      const reqVal = requested[key] === null || requested[key] === undefined ? '' : String(requested[key])
      if (origVal !== reqVal) {
        diff.push(key)
      }
    }
    return diff
  }

  const renderMockCard = (task: any, diffKeys: string[], isOriginal: boolean) => {
    const hasLift = task.lift || task.liftPlate
    return (
      <div className={`p-3 gap-3 rounded-2xl border mb-3 flex text-left transition-shadow duration-200 ${hasLift ? 'border-sky-100 bg-gradient-to-br from-sky-50/50 to-white' : 'border-gray-100 bg-white'} shadow-[0_2px_12px_rgb(0,0,0,0.04)] text-xs text-slate-600`}>
        {/* Left Index/Avatar */}
        <div className="shrink-0 pt-0.5">
          <div className={`bg-slate-100 border border-slate-200 text-slate-500 font-bold w-6 h-6 text-xs rounded-md flex items-center justify-center shadow-sm`}>
            {isOriginal ? 'เดิม' : 'ใหม่'}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div 
              className={`font-bold text-slate-800 text-sm truncate mb-1 ${diffKeys.includes('customerName') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}`} 
              title={task.customerName || ''}
            >
              {task.customerName || <span className="text-slate-400 italic">ไม่ระบุชื่อลูกค้า</span>}
            </div>
          </div>

          {hasLift && (
            <div className={`text-[10px] text-orange-700 bg-orange-100/60 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1 mb-1.5 font-bold ${diffKeys.includes('lift') || diffKeys.includes('liftPlate') ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : ''}`}>
              <Bike size={11} /> ยกรถ {task.liftPlate || ''} {!task.lift && '(ไม่ยก)'}
            </div>
          )}

          <div className={`font-bold mb-1 flex items-center gap-1 ${diffKeys.includes('details') ? 'bg-yellow-100 text-yellow-950 px-1 rounded font-bold' : 'text-red-650'}`}>
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" /> {task.details || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
          </div>

          <div className={`mb-1 flex items-center gap-1 ${diffKeys.includes('phone') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}`}>
            <Phone size={12} className="text-slate-400 shrink-0" /> {task.phone || <span className="text-slate-400 italic">ไม่มีเบอร์โทร</span>}
          </div>

          <div className={`mb-1 flex items-start gap-1 ${diffKeys.includes('location') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}`}>
            <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" /> 
            <span className="line-clamp-2" title={task.location || ''}>
              {task.location || <span className="text-slate-400 italic">ไม่ได้ระบุสถานที่</span>}
            </span>
          </div>

          {task.info && (
            <div className={`mb-1 text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 font-semibold ${diffKeys.includes('info') ? 'bg-yellow-100 border-yellow-300 text-yellow-950 font-bold' : ''}`}>
              <span>📝 ข้อมูล: {task.info}</span>
            </div>
          )}

          <div className={`text-blue-800 bg-blue-50/50 border border-blue-100 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 font-semibold ${diffKeys.includes('date') || diffKeys.includes('time') || diffKeys.includes('region') ? 'bg-yellow-100 border-yellow-300 text-yellow-950 font-bold' : ''}`}>
            <Calendar size={12} /> 
            <span>
              ภาค: {task.region} | นัดหมาย: {task.date ? new Date(task.date).toLocaleDateString('th-TH') : '-'} {task.time || ''}
            </span>
          </div>

          {(task.driverName || task.startTime || task.car || diffKeys.includes('driverName') || diffKeys.includes('startTime') || diffKeys.includes('car')) && (
            <div className={`mt-2 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px] ${diffKeys.includes('driverName') || diffKeys.includes('startTime') || diffKeys.includes('car') ? 'bg-yellow-50 border-yellow-200' : ''}`}>
              <div className={diffKeys.includes('driverName') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}>
                <b>ผู้รับงาน:</b> {task.driverName || '-'}
              </div>
              <div className={diffKeys.includes('startTime') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}>
                <b>เวลาเริ่ม:</b> {task.startTime || '-'}
              </div>
              <div className={diffKeys.includes('car') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}>
                <b>รถที่ใช้:</b> {task.car || '-'}
              </div>
            </div>
          )}

          <div className={`pt-2 mt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400 ${diffKeys.includes('admin') ? 'bg-yellow-100 text-yellow-900 px-1 rounded font-bold' : ''}`}>
            <UserPen size={12} /> เพิ่มโดย: {task.admin}
          </div>
        </div>
      </div>
    )
  }

  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/edit-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'อนุมัติการแก้ไขสำเร็จ', timer: 1500, showConfirmButton: false })
        loadData()
      } else {
        let errorMsg = 'ไม่สามารถอนุมัติได้'
        try {
          const errorData = await res.json() as any
          errorMsg = errorData.error || errorMsg
        } catch {
          errorMsg = `Server Error (${res.status})`
        }
        Swal.fire('Error', errorMsg, 'error')
      }
    } catch (error: any) {
      Swal.fire('Error', `ไม่สามารถอนุมัติได้: ${error.message || String(error)}`, 'error')
    }
  }

  const handleRejectRequest = async (id: string) => {
    const result = await Swal.fire({
      title: 'ปฏิเสธคำขอนี้?',
      text: "คำขอแก้ไขนี้จะถูกลบออก",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ปฏิเสธ',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/edit-requests/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject' })
        })
        if (res.ok) {
          Swal.fire('ปฏิเสธแล้ว!', 'ปฏิเสธคำขอเรียบร้อย', 'success')
          loadData()
        } else {
          let errorMsg = 'ไม่สามารถปฏิเสธคำขอได้'
          try {
            const errorData = await res.json() as any
            errorMsg = errorData.error || errorMsg
          } catch {
            errorMsg = `Server Error (${res.status})`
          }
          Swal.fire('Error', errorMsg, 'error')
        }
      } catch (error: any) {
        Swal.fire('Error', `ไม่สามารถปฏิเสธคำขอได้: ${error.message || String(error)}`, 'error')
      }
    }
  }

  useEffect(() => {
    loadData()
  }, [region])

  const loadData = async () => {
    try {
      // 1. Fetch tasks
      try {
        const res = await fetch(`/api/tasks?region=${region}&t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setTasks(Array.isArray(data) ? data : [])
        } else {
          console.error(`Failed to fetch tasks: ${res.status}`)
        }
      } catch (err) {
        console.error('Error parsing tasks JSON:', err)
      }

      // 2. Fetch staff
      try {
        const res = await fetch(`/api/staff?region=${region}&t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setStaffs(Array.isArray(data) ? data : [])
        } else {
          console.error(`Failed to fetch staff: ${res.status}`)
        }
      } catch (err) {
        console.error('Error parsing staff JSON:', err)
      }

      // 3. Fetch region config
      try {
        const res = await fetch(`/api/region-config?region=${region}&t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json() as any
          setRegionConfig({
            staffName: data?.staffName || '',
            startTime: data?.startTime || '',
            carPlate: data?.carPlate || ''
          })
        } else {
          console.error(`Failed to fetch region-config: ${res.status}`)
        }
      } catch (err) {
        console.error('Error parsing region config JSON:', err)
      }

      // 4. Fetch edit requests
      try {
        const res = await fetch(`/api/edit-requests?t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setEditRequests(data)
          }
        } else {
          console.error(`Failed to fetch edit-requests: ${res.status}`)
        }
      } catch (err) {
        console.error('Error parsing edit requests JSON:', err)
      }
    } catch (e) {
      console.error('General loadData error:', e)
    }
  }

  // Manage Staff functions
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaffName.trim()) return

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStaffName, region: newStaffRegion })
      })
      const data = await res.json() as any
      if (data.success) {
        setNewStaffName('')
        loadData()
        Swal.fire({ icon: 'success', title: 'เพิ่มพนักงานสำเร็จ', timer: 1500, showConfirmButton: false })
      } else {
        Swal.fire('Error', 'ไม่สามารถเพิ่มพนักงานได้', 'error')
      }
    } catch (e) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error')
    }
  }

  const handleDeleteStaff = async (id: string) => {
    const result = await Swal.fire({
      title: 'ลบพนักงานคนนี้?',
      text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      try {
        await fetch(`/api/staff/${id}`, { method: 'DELETE' })
        loadData()
        Swal.fire('ลบแล้ว!', 'ลบพนักงานเรียบร้อย', 'success')
      } catch (e) {
        Swal.fire('Error', 'ไม่สามารถลบข้อมูลได้', 'error')
      }
    }
  }
  const handleChangePIN = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'เปลี่ยนรหัส PIN (Manager)',
      html:
        '<input id="swal-input1" class="swal2-input" type="password" placeholder="รหัส PIN ปัจจุบัน">' +
        '<input id="swal-input2" class="swal2-input" type="password" placeholder="รหัส PIN ใหม่ (อย่างน้อย 4 ตัว)">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value
        ]
      }
    })

    if (formValues) {
      const [currentPin, newPin] = formValues
      if (!currentPin || !newPin) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'error')
        return
      }

      try {
        Swal.showLoading()
        const res = await fetch('/api/auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPin, newPin })
        })
        const data = await res.json() as any
        if (res.ok && data.success) {
          Swal.fire('สำเร็จ', 'เปลี่ยนรหัส PIN เรียบร้อยแล้ว', 'success')
        } else {
          Swal.fire('ล้มเหลว', data.error || 'เปลี่ยนรหัสผ่านล้มเหลว', 'error')
        }
      } catch (e) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนรหัส PIN ได้', 'error')
      }
    }
  }

  // Staff Config functions
  const openConfigModal = (staff: Staff) => {
    setSelectedStaff(staff)
    setConfigStartTime(staff.startTime || '')
    setConfigCarPlate(staff.carPlate || '')
    setIsConfigModalOpen(true)
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime: configStartTime, carPlate: configCarPlate })
      })
      const data = await res.json() as any
      if (data.success) {
        setIsConfigModalOpen(false)
        loadData()
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false })
      }
    } catch (e) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    }
  }

  // Region Config functions
  const openRegionConfigModal = () => {
    setRegionConfigForm(regionConfig)
    setIsRegionConfigModalOpen(true)
  }

  const handleSaveRegionConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/region-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, ...regionConfigForm })
      })
      const data = await res.json() as any
      if (data.success) {
        setIsRegionConfigModalOpen(false)
        loadData()
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false })
      }
    } catch (e) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการบันทึก', 'error')
    }
  }

  // Task Edit functions
  const openEditTaskModal = (task: Task) => {
    setEditingTask(task)
    setTaskFormData({
      date: new Date(task.date).toISOString().split('T')[0],
      region: task.region,
      customerName: task.customerName || '',
      phone: task.phone || '',
      details: task.details,
      lift: task.lift || false,
      liftPlate: task.liftPlate || '',
      location: task.location || '',
      time: task.time || '',
      admin: task.admin,
      driverName: task.driverName || '',
      startTime: task.startTime || '',
      car: task.car || '',
      info: task.info || ''
    })
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskFormData, id: editingTask.id })
      })
      const data = await res.json() as any
      if (data.success) {
        setIsTaskModalOpen(false)
        loadData()
        Swal.fire({ icon: 'success', title: 'แก้ไขข้อมูลสำเร็จ', timer: 1500, showConfirmButton: false })
      }
    } catch (e) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error')
    }
  }

  const handleDeleteTask = async (id: string) => {
    const result = await Swal.fire({
      title: 'ลบงานนี้?',
      text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        if (res.ok) {
          loadData()
          Swal.fire('ลบแล้ว!', 'ลบงานเรียบร้อย', 'success')
        } else {
          let errorMsg = 'ไม่สามารถลบข้อมูลได้'
          try {
            const errData = await res.json() as any
            errorMsg = errData.error || errorMsg
          } catch {}
          Swal.fire('Error', errorMsg, 'error')
        }
      } catch (e: any) {
        Swal.fire('Error', e.message || 'ไม่สามารถลบข้อมูลได้', 'error')
      }
    }
  }

  // Print functions
  const openPrintModal = () => {
    setPrintStartDate(getTomorrowDate())
    setPrintEndDate(getTomorrowDate())
    setPrintStaffs(staffs.map(s => s.name))
    setSelectAllPrint(true)
    setIsPrintModalOpen(true)
  }

  const handleToggleSelectAllPrint = (checked: boolean) => {
    setSelectAllPrint(checked)
    if (checked) {
      setPrintStaffs(staffs.map(s => s.name))
    } else {
      setPrintStaffs([])
    }
  }

  const handleTogglePrintStaff = (name: string) => {
    setPrintStaffs(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      setSelectAllPrint(next.length === staffs.length)
      return next
    })
  }

  const handleGeneratePrint = async () => {
    if (printStaffs.length === 0) {
      Swal.fire('คำเตือน', 'กรุณาเลือกพนักงานอย่างน้อย 1 คน', 'warning')
      return
    }

    const query = new URLSearchParams({
      startDate: printStartDate,
      endDate: printEndDate,
      staffs: printStaffs.join(','),
      region: region
    }).toString()

    const printWindow = window.open(`/manager/print?${query}`, '_blank')
    if (printWindow) {
      printWindow.focus()
    }
  }

  // Kanban Drag & Drop
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return
    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const movedTask = tasks.find(t => t.id === draggableId)
    if (!movedTask) return

    const otherTasks = tasks.filter(t => 
      t.id !== draggableId && 
      t.assignee !== source.droppableId && 
      t.assignee !== destination.droppableId
    )
    
    let sourceTasks = tasks
      .filter(t => t.id !== draggableId && (t.assignee === source.droppableId || (source.droppableId === 'รอแพลน' && (!t.assignee || t.assignee === 'รอแพลน'))))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
    
    let destTasks = tasks
      .filter(t => t.id !== draggableId && (t.assignee === destination.droppableId || (destination.droppableId === 'รอแพลน' && (!t.assignee || t.assignee === 'รอแพลน'))))
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const updatedMovedTask = { ...movedTask, assignee: destination.droppableId }

    if (source.droppableId === destination.droppableId) {
      const colTasks = [...sourceTasks]
      colTasks.splice(destination.index, 0, updatedMovedTask)
      colTasks.forEach((t, i) => { t.order = i })
      
      const merged = [...otherTasks, ...colTasks]
      setTasks(merged)
      
      const updates = colTasks.map(t => ({ id: t.id, assignee: t.assignee, order: t.order }))
      await fetch('/api/tasks/kanban', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    } else {
      sourceTasks.forEach((t, i) => { t.order = i })
      destTasks.splice(destination.index, 0, updatedMovedTask)
      destTasks.forEach((t, i) => { t.order = i })

      const merged = [...otherTasks, ...sourceTasks, ...destTasks]
      setTasks(merged)

      const updates = [
        ...sourceTasks.map(t => ({ id: t.id, assignee: t.assignee, order: t.order })),
        ...destTasks.map(t => ({ id: t.id, assignee: t.assignee, order: t.order }))
      ]
      await fetch('/api/tasks/kanban', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    }
  }

  // FIX zoom coordinate issue: Map zoom percent to responsive CSS classes instead of CSS zoom/scale
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

  const handleSavePlan = async () => {
    const targetDate = dateFilter || getTomorrowDate()
    const tasksToSave = tasks.filter(t => t.date.startsWith(targetDate))
    
    try {
      Swal.fire({
        title: 'บันทึกแพลนงาน',
        text: `คุณต้องการบันทึกประวัติแพลนงานของวันที่ ${new Date(targetDate).toLocaleDateString('th-TH')} ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#3085d6'
      }).then(async (result) => {
        if (result.isConfirmed) {
          Swal.showLoading()
          const payload = {
            date: targetDate,
            snapshotData: JSON.stringify({
              tasks: tasksToSave,
              staffs: staffs,
              region: region
            })
          }
          
          const res = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (res.ok) {
            Swal.fire('สำเร็จ', `บันทึกประวัติแพลนงานวันที่ ${new Date(targetDate).toLocaleDateString('th-TH')} เรียบร้อยแล้ว`, 'success')
          } else {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกประวัติแพลนงานได้', 'error')
          }
        }
      })
    } catch (e) {
      Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error')
    }
  }

  const zoomStyle = getZoomClasses(zoom)

  const columns = ['รอแพลน', ...staffs.map(s => s.name)]
  const filteredColumns = staffFilter === 'All' ? columns : ['รอแพลน', staffFilter]

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc] text-gray-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-3 shrink-0 shadow-[0_2px_15px_rgb(0,0,0,0.03)] z-20 sticky top-0 overflow-x-auto w-full">
        <div className="flex justify-between items-center min-w-[1000px] w-full">
          <div className="font-bold text-xl text-gray-800 flex items-center gap-2 shrink-0">
            <img src="/logo-ccenter.png" alt="C Center" className="w-8 h-8 object-contain" /> C Center <span className="text-sm font-normal text-gray-500 ml-1">Manager View</span>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            <div className="flex items-center bg-slate-50 border rounded-lg px-2 py-1 gap-1 shrink-0 whitespace-nowrap">
              <span className="text-xs text-slate-500 font-medium">แสดงพนักงาน:</span>
              <select 
                value={staffFilter} 
                onChange={(e) => setStaffFilter(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none py-1"
              >
                <option value="All">ดูทุกคน (All Staff)</option>
                {staffs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex items-center bg-slate-50 rounded-lg border px-1 py-1 shrink-0">
              <button onClick={() => setZoom(Math.max(60, zoom - 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomOut size={16} /></button>
              <span className="text-xs font-bold w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(120, zoom + 10))} className="p-1 hover:bg-slate-200 rounded"><ZoomIn size={16} /></button>
            </div>

            <button onClick={loadData} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0" title="อัปเดตงาน">
              <RefreshCw size={15} className="text-sky-500" /> อัปเดตงาน
            </button>

            <button onClick={handleSavePlan} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <Save size={15} /> บันทึกแพลน
            </button>
            <button onClick={() => router.push('/plan-history')} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <History size={15} className="text-blue-500" /> ประวัติ
            </button>

            <button onClick={openPrintModal} className="bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-[0_4px_10px_rgb(251,191,36,0.2)] flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <Printer size={15} /> ปริ้นท์ Daily Plan
            </button>
            <button onClick={() => setIsStaffModalOpen(true)} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <Users size={15} /> จัดการพนักงาน
            </button>
            <button onClick={handleChangePIN} className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all hover:-translate-y-0.5 whitespace-nowrap shrink-0">
              <Key size={15} /> เปลี่ยนรหัส PIN
            </button>
            <button onClick={() => router.push('/')} className="text-slate-400 hover:text-red-500 p-1.5 transition shrink-0">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Region Selector */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-2.5 flex items-center gap-2 flex-wrap shrink-0 shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-10">
        <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><MapPin size={14} /> เลือกพื้นที่ทำงาน:</span>
        <div className="flex gap-2">
          {REGIONS.map(reg => (
            <button 
              key={reg}
              onClick={() => {
                setRegion(reg)
                setStaffFilter('All')
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 ${region === reg ? 'bg-gradient-to-r from-gray-900 to-black text-sky-400 font-bold shadow-[0_4px_10px_rgb(0,0,0,0.15)] transform -translate-y-0.5' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {reg}
            </button>
          ))}
        </div>
        <div className="ml-4 flex items-center gap-2 border-l border-slate-300 pl-4">
           <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={14} /> วันนัด:</span>
           <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-sm">
             <input 
               type="date" 
               value={dateFilter} 
               onChange={(e) => setDateFilter(e.target.value)} 
               className="text-xs outline-none bg-transparent font-medium text-slate-700"
             />
             {dateFilter && (
               <button onClick={() => setDateFilter('')} className="ml-1 text-slate-400 hover:text-red-500 text-[10px]">
                 ❌
               </button>
             )}
           </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext 
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(result) => {
          setIsDragging(false)
          handleDragEnd(result)
        }}
      >
        <main className="flex-1 bg-[#f8f9fc] pt-6" id="board-container">
          {region !== 'ภาคกลาง' && (
            <div className="mb-4 mx-6 bg-sky-50 border border-sky-200 rounded-xl p-3 flex justify-between items-center shadow-[0_2px_10px_rgb(251,191,36,0.1)]">
              <div className="flex items-center gap-6 text-sm font-bold text-sky-900">
                <span className="text-base text-sky-600">📌 ข้อมูลหลักประจำ{region}:</span>
                <span>👤 ผู้รับงาน: <span className="text-gray-800">{regionConfig.staffName || '-'}</span></span>
                <span>⏰ เวลาออก: <span className="text-gray-800">{regionConfig.startTime || '-'}</span></span>
                <span>🚗 รถที่ใช้: <span className="text-gray-800">{regionConfig.carPlate || '-'}</span></span>
              </div>
              <button onClick={openRegionConfigModal} className="text-sky-600 hover:text-sky-800 bg-white border border-sky-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
                <Edit size={14} className="inline mr-1" /> แก้ไขข้อมูลหลัก
              </button>
            </div>
          )}
          <div className={`flex ${zoomStyle.gapSize} h-full items-stretch min-w-max pb-6`}>
            <div className="w-4 shrink-0" /> {/* Left Spacer */}
            {filteredColumns.map(colId => {
              const colTasks = tasks.filter(t => 
                (dateFilter ? t.date.startsWith(dateFilter) : true) && 
                (t.assignee === colId || (colId === 'รอแพลน' && (!t.assignee || t.assignee === 'รอแพลน')))
              ).sort((a,b) => (a.order || 0) - (b.order || 0))
              const colLiftTasksCount = colTasks.filter(t => t.lift).length
              const staff = staffs.find(s => s.name === colId)
              const isSingleStaff = staffFilter !== 'All'
              
              return (
                <div key={colId} className={`${colId === 'รอแพลน' ? zoomStyle.colWidth : (isSingleStaff ? 'flex-1 min-w-[320px]' : zoomStyle.colWidth)} shrink-0 flex flex-col max-h-full`}>
                  <div className={`p-4 rounded-t-2xl border-t-4 shadow-[0_4px_15px_rgb(0,0,0,0.03)] font-bold flex justify-between items-center ${colId === 'รอแพลน' ? 'bg-gradient-to-b from-sky-50/80 to-white border-sky-400 text-sky-900' : 'bg-gradient-to-b from-white to-gray-50/50 border-gray-300 text-gray-800'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`truncate ${zoomStyle.titleSize} flex items-center gap-1`}>
                          {colId}
                          {colId !== 'รอแพลน' && colLiftTasksCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-orange-600 font-bold ml-1" title="งานยกรถ">
                              <Bike size={zoomStyle.iconSize + 2} /> {colLiftTasksCount}
                            </span>
                          )}
                        </span>
                        {staff && (
                          <button onClick={() => openConfigModal(staff)} className="text-slate-400 hover:text-sky-600 p-0.5" title="ตั้งค่าเวลา/รถ">
                            <Cog size={zoomStyle.iconSize + 2} />
                          </button>
                        )}
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
                  
                  <Droppable droppableId={colId}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className="flex-1 bg-white p-3 rounded-b-2xl border-x border-b border-dashed border-gray-200 overflow-y-auto min-h-[250px] shadow-[inset_0_2px_10px_rgb(0,0,0,0.01)]"
                      >
                        {colTasks.map((t, index) => (
                          <Draggable key={t.id} draggableId={t.id!} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  zIndex: snapshot.isDragging ? 9999 : (provided.draggableProps.style as any)?.zIndex || 50,
                                  opacity: snapshot.isDragging ? 0.92 : 1,
                                  boxShadow: snapshot.isDragging ? '0 20px 40px rgba(0,0,0,0.18)' : undefined,
                                }}
                                className={`${zoomStyle.cardPadding} rounded-2xl border mb-3 flex group cursor-grab active:cursor-grabbing transition-shadow duration-200 hover:shadow-[0_8px_25px_rgb(0,0,0,0.08)] ${t.lift ? 'border-sky-100 bg-gradient-to-br from-sky-50/50 to-white' : 'border-gray-100 bg-white'} shadow-[0_2px_12px_rgb(0,0,0,0.04)]`}
                              >
                                {/* Left Index Sequence */}
                                <div className="shrink-0 pt-0.5">
                                  <div className={`bg-slate-100 border border-slate-200 text-slate-500 font-bold ${zoomStyle.avatarSize} rounded-md flex items-center justify-center shadow-sm`}>
                                    {index + 1}
                                  </div>
                                </div>

                                {/* Card Body */}
                                <div className={`flex-1 min-w-0 ${zoomStyle.fontSize} text-slate-600`}>
                                  <div className="flex justify-between items-start">
                                    <div className={`font-bold text-slate-800 ${zoomStyle.titleSize} truncate mb-1`} title={t.customerName || ''}>
                                      {t.customerName}
                                    </div>
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition duration-150">
                                      <button onClick={() => openEditTaskModal(t)} className="text-slate-400 hover:text-blue-600 p-0.5"><Edit size={zoomStyle.iconSize + 1} /></button>
                                      <button onClick={() => handleDeleteTask(t.id!)} className="text-slate-400 hover:text-red-600 p-0.5"><Trash size={zoomStyle.iconSize + 1} /></button>
                                    </div>
                                  </div>
                                  
                                  {t.lift && (
                                    <div className="text-[10px] text-orange-700 bg-orange-100/60 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1 mb-1.5 font-bold">
                                      <Bike size={11} /> ยกรถ {t.liftPlate}
                                    </div>
                                  )}
                                  
                                  <div className="text-red-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full shrink-0" /> {t.details}
                                  </div>

                                  {t.phone && (
                                    <div className="mb-1 flex items-center gap-1"><Phone size={zoomStyle.iconSize} className="text-slate-400 shrink-0" /> {t.phone}</div>
                                  )}

                                  {t.location && (
                                    <div className="mb-1 flex items-start gap-1"><MapPin size={zoomStyle.iconSize} className="text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2" title={t.location}>{t.location}</span></div>
                                  )}

                                  {t.info && (
                                    <div className="mb-1 text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 font-semibold">
                                      <span>📝 ข้อมูล: {t.info}</span>
                                    </div>
                                  )}

                                  <div className="text-blue-800 bg-blue-50/50 border border-blue-100 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1 font-semibold">
                                    <Calendar size={zoomStyle.iconSize} /> นัดหมาย: {new Date(t.date).toLocaleDateString('th-TH')} {t.time}
                                  </div>

                                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
                                    <UserPen size={zoomStyle.iconSize} /> เพิ่มโดย: {t.admin}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
            <div className="w-4 shrink-0" /> {/* Right Spacer */}
          </div>
        </main>
      </DragDropContext>

      {/* 1. Manage Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> จัดการพนักงาน (ประจำภาค)</h3>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddStaff} className="flex gap-2 mb-4">
                <select 
                  value={newStaffRegion} 
                  onChange={e => setNewStaffRegion(e.target.value)}
                  className="border rounded-lg p-2 outline-none w-1/3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {REGIONS.map(reg => <option key={reg} value={reg}>{reg}</option>)}
                </select>
                <input 
                  type="text" 
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  placeholder="ชื่อพนักงาน" 
                  required
                  className="border rounded-lg p-2 outline-none flex-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center"><Plus size={18} /></button>
              </form>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">ภาค</th>
                      <th className="px-4 py-2.5 font-bold">ชื่อ</th>
                      <th className="px-4 py-2.5 font-bold text-center w-16">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600">
                    {staffs.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-6 text-slate-400">ยังไม่มีพนักงานประจำภาคนี้</td></tr>
                    ) : (
                      staffs.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{s.region}</span></td>
                          <td className="px-4 py-2.5 font-medium">{s.name}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button type="button" onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:text-red-700 p-1"><Trash size={15} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Staff Config Modal */}
      {isConfigModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><Cog size={18} className="text-blue-600" /> ตั้งค่าการทำงานพนักงาน</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">พนักงาน:</span>
                <span className="font-bold text-slate-800 text-base">{selectedStaff.name} ({selectedStaff.region})</span>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เวลาเริ่มงาน</label>
                <input 
                  type="text" 
                  value={configStartTime}
                  onChange={e => setConfigStartTime(e.target.value)}
                  placeholder="เช่น 08:30 น." 
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รถบริษัทที่ใช้ (ป้ายทะเบียน)</label>
                <input 
                  type="text" 
                  value={configCarPlate}
                  onChange={e => setConfigCarPlate(e.target.value)}
                  placeholder="เช่น ฮน-9988 กรุงเทพฯ" 
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-md transition">บันทึกรายละเอียด</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Task Edit Modal */}
      {isTaskModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800">แก้ไขข้อมูลงาน</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่นัดหมาย *</label>
                    <input type="date" required value={taskFormData.date} onChange={e => setTaskFormData({...taskFormData, date: e.target.value})} className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ภาค *</label>
                    <select required value={taskFormData.region} onChange={e => setTaskFormData({...taskFormData, region: e.target.value})} className="w-full border rounded-lg p-2 outline-none">
                      <option value="ภาคกลาง">ภาคกลาง</option>
                      <option value="ภาคเหนือ">ภาคเหนือ</option>
                      <option value="ภาคอีสาน">ภาคอีสาน</option>
                      <option value="ภาคใต้">ภาคใต้</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า</label>
                    <input type="text" value={taskFormData.customerName} onChange={e => setTaskFormData({...taskFormData, customerName: e.target.value})} className="w-full border rounded-lg p-2 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                    <input type="text" value={taskFormData.phone} onChange={e => setTaskFormData({...taskFormData, phone: e.target.value})} className="w-full border rounded-lg p-2 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียดงาน *</label>
                    <input type="text" required value={taskFormData.details} onChange={e => setTaskFormData({...taskFormData, details: e.target.value})} className="w-full border rounded-lg p-2 outline-none" placeholder="เช่น ต่อภาษี, ปิดบัญชี" />
                  </div>
                  
                  <div className="flex items-center gap-4 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-sm text-orange-800">
                      <input type="checkbox" checked={taskFormData.lift} onChange={e => setTaskFormData({...taskFormData, lift: e.target.checked})} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-200" />
                      <span>🛵 เคสยกรถ</span>
                    </label>
                    {taskFormData.lift && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-orange-600 shrink-0">ทะเบียน:</span>
                        <input type="text" value={taskFormData.liftPlate} onChange={e => setTaskFormData({...taskFormData, liftPlate: e.target.value})} placeholder="เช่น กข-1234" className="flex-1 text-xs border rounded-md p-1.5 outline-none focus:border-orange-300" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
                    <input type="text" value={taskFormData.location} onChange={e => setTaskFormData({...taskFormData, location: e.target.value})} className="w-full border rounded-lg p-2 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ระบุเวลา</label>
                    <input type="text" value={taskFormData.time} onChange={e => setTaskFormData({...taskFormData, time: e.target.value})} className="w-full border rounded-lg p-2 outline-none" placeholder="เช่น 08:00-12:00" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ข้อมูล (รายละเอียดรถ, ไฟแนนซ์, ยอดปิด)</label>
                  <input type="text" value={taskFormData.info || ''} onChange={e => setTaskFormData({...taskFormData, info: e.target.value})} className="w-full border rounded-lg p-2 outline-none" placeholder="ระบุรายละเอียดรถ, ไฟแนนซ์, ยอดปิด" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">แอดมิน (ผู้เพิ่ม)</label>
                  <input type="text" required value={taskFormData.admin} onChange={e => setTaskFormData({...taskFormData, admin: e.target.value})} className="w-full border rounded-lg p-2 outline-none" />
                </div>

                {taskFormData.region !== 'ภาคกลาง' && (
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">ผู้รับงาน</label>
                      <input type="text" value={taskFormData.driverName} onChange={e => setTaskFormData({...taskFormData, driverName: e.target.value})} className="w-full border rounded-md p-1.5 text-sm outline-none" placeholder="ชื่อพนักงาน" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">เวลาเริ่มงาน</label>
                      <input type="text" value={taskFormData.startTime} onChange={e => setTaskFormData({...taskFormData, startTime: e.target.value})} className="w-full border rounded-md p-1.5 text-sm outline-none" placeholder="เช่น 08:30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">รถที่ใช้</label>
                      <input type="text" value={taskFormData.car} onChange={e => setTaskFormData({...taskFormData, car: e.target.value})} className="w-full border rounded-md p-1.5 text-sm outline-none" placeholder="ทะเบียนรถ" />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                  <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">ยกเลิก</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-md transition">บันทึกข้อมูล</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Daily Plan Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><Printer size={18} className="text-green-600" /> ออกเอกสาร Daily Plan</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">วันที่เริ่มต้น</label>
                  <input 
                    type="date" 
                    value={printStartDate}
                    onChange={e => setPrintStartDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">วันที่สิ้นสุด</label>
                  <input 
                    type="date" 
                    value={printEndDate}
                    onChange={e => setPrintEndDate(e.target.value)}
                    className="w-full border rounded-lg p-2 text-xs outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เลือกพนักงาน (เลือกได้หลายคน)</label>
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <input 
                    type="checkbox" 
                    id="selectAllPrintStaff" 
                    checked={selectAllPrint}
                    onChange={e => handleToggleSelectAllPrint(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300" 
                  />
                  <label htmlFor="selectAllPrintStaff" className="text-xs font-bold text-slate-600 cursor-pointer">เลือกทุกคน (Select All)</label>
                </div>
                <div className="border rounded-lg p-2.5 max-h-40 overflow-y-auto space-y-2 bg-slate-50/50">
                  {staffs.length === 0 ? (
                    <div className="text-center py-2 text-xs text-slate-400">ไม่มีพนักงานในภาคนี้</div>
                  ) : (
                    staffs.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`print-${s.id}`} 
                          checked={printStaffs.includes(s.name)}
                          onChange={() => handleTogglePrintStaff(s.name)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300"
                        />
                        <label htmlFor={`print-${s.id}`} className="text-xs text-slate-700 cursor-pointer font-medium">{s.name}</label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button 
                onClick={handleGeneratePrint}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg mt-2 font-bold transition duration-200 shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer size={16} /> สร้างเอกสาร / พิมพ์
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Region Config Modal */}
      {isRegionConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Cog size={20} className="text-blue-600" /> ข้อมูลหลักประจำ{region}</h3>
              <button onClick={() => setIsRegionConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveRegionConfig} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ผู้รับงาน</label>
                  <input type="text" value={regionConfigForm.staffName} onChange={e => setRegionConfigForm({...regionConfigForm, staffName: e.target.value})} className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="ชื่อผู้รับงาน" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เวลาออก</label>
                  <input type="text" value={regionConfigForm.startTime} onChange={e => setRegionConfigForm({...regionConfigForm, startTime: e.target.value})} className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="เช่น 8:30 น." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รถที่ใช้</label>
                  <input type="text" value={regionConfigForm.carPlate} onChange={e => setRegionConfigForm({...regionConfigForm, carPlate: e.target.value})} className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="เช่น 4882" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRegionConfigModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded text-sm font-bold hover:bg-slate-200">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 shadow">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Approval Modal */}
      {isEditRequestsModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span>🔔 คำขออนุมัติแก้ไขงาน ({editRequests.length})</span>
              </h3>
              <button onClick={() => setIsEditRequestsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {editRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">ไม่มีคำขอแก้ไขที่รอการอนุมัติ</div>
              ) : (
                <div className="space-y-6">
                  {editRequests.map((req) => {
                    const original = JSON.parse(req.originalFields)
                    const requested = JSON.parse(req.requestedFields)
                    const diffKeys = getDiff(original, requested)

                    return (
                      <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-4 border-b pb-3 flex-wrap gap-2">
                          <div>
                            <span className="font-bold text-slate-800 text-sm">
                              คำขอแก้ไขงานของลูกค้า: <span className="text-sky-600 font-semibold">{original.customerName || 'ไม่ระบุชื่อ'}</span>
                            </span>
                            <div className="text-[11px] text-slate-400 mt-1">
                              ผู้ขอ: <span className="font-semibold text-slate-600">{req.admin}</span> | {new Date(req.createdAt).toLocaleString('th-TH')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                              อนุมัติ (Approve)
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="bg-red-650 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                              ปฏิเสธ (Reject)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-bold text-red-650 mb-2 uppercase tracking-wide">เดิม (Original)</div>
                            {renderMockCard(original, diffKeys, true)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wide">ใหม่ (Requested)</div>
                            {renderMockCard(requested, diffKeys, false)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditRequestsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

