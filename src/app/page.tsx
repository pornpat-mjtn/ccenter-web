'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Task } from '@/types'
import { Users, Lock, Plus, Clock, UserPen, Phone, MapPin, Edit, Trash, Bike, RefreshCw } from 'lucide-react'
import Swal from 'sweetalert2'

export default function StaffPortal() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [pendingRequests, setPendingRequests] = useState<any[]>([])

  // Form State
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    // Adjust for timezone offset if necessary, but split('T')[0] on local time is safer:
    const offset = tomorrow.getTimezoneOffset() * 60000
    const localISOTime = (new Date(tomorrow.getTime() - offset)).toISOString().slice(0, 10)
    return localISOTime
  }

  const [formData, setFormData] = useState({
    date: getTomorrowDate(), region: 'ภาคกลาง', customerName: '', phone: '',
    details: '', lift: false, liftPlate: '', location: '', time: '', admin: '',
    driverName: '',
    startTime: '',
    car: '',
    info: ''
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const [tasksRes, editReqsRes] = await Promise.all([
        fetch('/api/tasks?assignee=รอแพลน'),
        fetch('/api/edit-requests')
      ])
      const tasksData = await tasksRes.json() as any
      const editReqsData = await editReqsRes.json() as any
      if (Array.isArray(tasksData)) {
        setTasks(tasksData)
      } else {
        setTasks([])
      }
      if (Array.isArray(editReqsData)) {
        setPendingRequests(editReqsData)
      } else {
        setPendingRequests([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleManagerLogin = async () => {
    const { value: pin } = await Swal.fire({
      title: 'Manager Login',
      input: 'password',
      inputLabel: 'กรุณาใส่รหัสผ่าน (PIN) *ค่าเริ่มต้นคือ 1234',
      inputPlaceholder: 'ใส่รหัส 4 หลัก',
      showCancelButton: true,
      confirmButtonText: 'เข้าสู่ระบบ',
      cancelButtonText: 'ยกเลิก',
    })

    if (pin) {
      setLoading(true)
      Swal.showLoading()
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        })
        const data = await res.json() as any
        if (data.success) {
          Swal.close()
          router.push('/manager')
        } else {
          Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error')
        }
      } catch (error) {
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'ลบงานนี้?',
      text: "คุณจะไม่สามารถกู้คืนได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!'
    })

    if (result.isConfirmed) {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      loadTasks()
      Swal.fire('ลบแล้ว!', 'งานถูกลบเรียบร้อย', 'success')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTask) {
        const payload = { ...formData, id: editingTask.id }
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        setIsModalOpen(false)
        loadTasks()
        Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', 'success')
      } else {
        const payload = { ...formData }
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        setIsModalOpen(false)
        loadTasks()
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success')
      }
    } catch (e) {
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้', 'error')
    }
  }

  const openAddModal = () => {
    setEditingTask(null)
    setFormData({
      date: getTomorrowDate(), region: 'ภาคกลาง', customerName: '', phone: '',
      details: '', lift: false, liftPlate: '', location: '', time: '', admin: '',
      driverName: '', startTime: '', car: '', info: ''
    })
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setFormData({
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
    setIsModalOpen(true)
  }

  const filteredTasks = tasks.filter(t => 
    (filter === 'All' || t.region === filter) &&
    (dateFilter ? t.date.startsWith(dateFilter) : true)
  )

  const counts = {
    'All': tasks.length,
    'ภาคกลาง': tasks.filter(t => t.region === 'ภาคกลาง').length,
    'ภาคเหนือ': tasks.filter(t => t.region === 'ภาคเหนือ').length,
    'ภาคอีสาน': tasks.filter(t => t.region === 'ภาคอีสาน').length,
    'ภาคใต้': tasks.filter(t => t.region === 'ภาคใต้').length,
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm px-6 py-4 flex justify-between items-center mb-6 border-b border-gray-200 sticky top-0 z-20">
        <div className="font-bold text-xl text-gray-800 flex items-center">
          <img src="/logo-ccenter.png" alt="C Center" className="w-8 h-8 mr-2 object-contain" /> C Center <span className="text-sm font-normal text-gray-500 ml-2 mt-1">Staff View</span>
        </div>
        <button 
          onClick={handleManagerLogin} 
          disabled={loading}
          className="text-gray-400 hover:text-sky-500 transition p-2.5 rounded-full hover:bg-sky-50"
          title="Manager Login"
        >
          <Lock className="w-5 h-5" />
        </button>
      </nav>
      <div className="max-w-6xl mx-auto px-4">
        {/* Dashboard Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(counts).map(([key, count]) => {
            const isActive = filter === key
            return (
              <div 
                key={key} 
                onClick={() => setFilter(key)}
                className={`rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-1 
                  ${isActive 
                    ? 'border border-sky-200 bg-gradient-to-b from-sky-50 to-white shadow-[0_8px_20px_rgb(251,191,36,0.15)] transform -translate-y-1' 
                    : 'border border-gray-100 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgb(0,0,0,0.06)] hover:-translate-y-0.5'}`}
              >
                <div className={`text-sm font-medium ${isActive ? 'text-sky-600' : 'text-gray-500'}`}>{key === 'All' ? 'รวมทุกภาค' : key}</div>
                <div className={`text-3xl font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{count}</div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">รายการงาน <span className="text-sky-500 font-semibold bg-sky-50 px-2 py-0.5 rounded-md text-lg ml-1">(รอแพลน)</span></h2>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-50 transition-all">
              <Clock className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)} 
                className="text-sm outline-none bg-transparent font-medium text-gray-600 w-[110px]"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="ml-2 text-gray-300 hover:text-red-500 text-xs">
                  ล้าง
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadTasks} 
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 font-medium transition-all transform hover:-translate-y-0.5"
            >
              <RefreshCw className="w-4 h-4 text-sky-500" /> อัปเดตงาน
            </button>
            <button onClick={openAddModal} className="bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 text-white px-5 py-2.5 rounded-xl shadow-[0_4px_15px_rgb(0,0,0,0.1)] flex items-center font-medium transition-all transform hover:-translate-y-0.5">
              <Plus className="w-5 h-5 mr-1 text-sky-400" /> เพิ่มงานใหม่
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ภาค</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่/เวลา</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">แอดมิน</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ลูกค้า/เบอร์โทร</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานที่</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50 text-sm">
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-500">ไม่มีงานที่รอแพลน</td></tr>
              ) : (
                filteredTasks.map(t => (
                  <tr key={t.id} className="hover:bg-sky-50/30">
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-medium">{t.region}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('th-TH')}<br/>
                      <span className="text-gray-500 text-xs flex items-center"><Clock className="w-3 h-3 mr-1" /> {t.time}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm flex items-center">
                      <UserPen className="w-4 h-4 text-gray-400 mr-1" /> {t.admin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center flex-wrap gap-1">
                        <b>{t.customerName}</b>
                      </div>
                      <span className="text-gray-500 text-xs flex items-center mt-1"><Phone className="w-3 h-3 mr-1" /> {t.phone}</span>
                    </td>
                    <td className="px-6 py-4 text-sm min-w-[150px]">
                      <span className="flex items-start"><MapPin className="w-4 h-4 text-gray-400 mr-1 shrink-0 mt-0.5" /> {t.location}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 min-w-[200px]">
                      {t.details} 
                      {t.lift && (
                        <span className="inline-flex items-center bg-sky-50 text-sky-700 font-medium px-2 py-0.5 rounded-md text-[11px] ml-2 mt-1 border border-sky-200">
                          <Bike className="w-3 h-3 mr-1" /> ยกรถ {t.liftPlate}
                        </span>
                      )}
                      {t.info && (
                        <span className="inline-flex items-center bg-slate-50 text-slate-700 font-medium px-2 py-0.5 rounded-md text-[11px] ml-2 mt-1 border border-slate-200">
                          📝 ข้อมูล: {t.info}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button onClick={() => openEditModal(t)} className="text-sky-600 hover:text-sky-800" title="แก้ไขงาน"><Edit className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-gray-100">
            <div className="px-7 py-5 shrink-0 flex justify-between items-center border-b border-gray-100">
              <h3 className="font-semibold text-lg text-gray-900">{editingTask ? 'แก้ไขงาน' : 'เพิ่มงานใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-sm">✕</button>
            </div>
            <div className="px-7 py-5 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">วันที่นัดหมาย *</label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">ภาค *</label>
                    <select required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all">
                      <option value="ภาคกลาง">ภาคกลาง</option>
                      <option value="ภาคเหนือ">ภาคเหนือ</option>
                      <option value="ภาคอีสาน">ภาคอีสาน</option>
                      <option value="ภาคใต้">ภาคใต้</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">ชื่อลูกค้า</label>
                    <input type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">เบอร์โทร</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">รายละเอียดงาน *</label>
                    <input type="text" required value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" placeholder="เช่น ต่อภาษี, ปิดบัญชี" />
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 px-4 py-3 rounded-xl">
                    <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={formData.lift} onChange={e => setFormData({...formData, lift: e.target.checked})} className="w-4 h-4 rounded border-gray-300 outline-none accent-gray-900" />
                      <span>🛵 เคสยกรถ</span>
                    </label>
                    {formData.lift && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium shrink-0">ทะเบียน:</span>
                        <input type="text" value={formData.liftPlate} onChange={e => setFormData({...formData, liftPlate: e.target.value})} placeholder="เช่น กข-1234" className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none text-gray-800 focus:border-gray-900 transition-all" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">สถานที่</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">ระบุเวลา</label>
                    <input type="text" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" placeholder="เช่น 08:00-12:00" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">ข้อมูล (รายละเอียดรถ, ไฟแนนซ์, ยอดปิด)</label>
                  <input type="text" value={formData.info || ''} onChange={e => setFormData({...formData, info: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" placeholder="ระบุรายละเอียดรถ, ไฟแนนซ์, ยอดปิด" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">แอดมิน (ผู้เพิ่ม)</label>
                  <input type="text" required value={formData.admin} onChange={e => setFormData({...formData, admin: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all" />
                </div>

                {formData.region !== 'ภาคกลาง' && (
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 border border-gray-100 p-4 rounded-xl">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">ผู้รับงาน</label>
                      <input type="text" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none text-gray-800 focus:border-gray-900 transition-all" placeholder="ชื่อพนักงาน" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">เวลาเริ่ม</label>
                      <input type="text" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none text-gray-800 focus:border-gray-900 transition-all" placeholder="08:30" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">รถที่ใช้</label>
                      <input type="text" value={formData.car} onChange={e => setFormData({...formData, car: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none text-gray-800 focus:border-gray-900 transition-all" placeholder="ทะเบียนรถ" />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">ยกเลิก</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm">บันทึกข้อมูล</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
