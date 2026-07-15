export interface Task {
  id?: string
  createdAt?: string
  date: string
  region: string
  admin: string
  details: string
  customerName?: string
  phone?: string
  location?: string
  time?: string
  assignee?: string
  order?: number
  lift?: boolean
  liftPlate?: string | null
  driverName?: string | null
  startTime?: string | null
  car?: string | null
}

export interface Staff {
  id: string
  region: string
  name: string
  startTime?: string
  carPlate?: string
}
