/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRequestContext } from '@cloudflare/next-on-pages'

function getD1(): any {
  try {
    const ctx = getRequestContext()
    if (ctx && ctx.env && (ctx.env as any).DB) {
      return (ctx.env as any).DB
    }
  } catch (e) {}
  return null
}

function formatTask(row: any) {
  if (!row) return null
  return {
    ...row,
    lift: Boolean(row.lift),
    date: row.date ? new Date(row.date) : row.date
  }
}

function formatStaff(row: any) {
  if (!row) return null
  return row
}

function formatSetting(row: any) {
  if (!row) return null
  return row
}

function formatEditRequest(row: any) {
  if (!row) return null
  return {
    ...row,
    createdAt: row.createdAt ? new Date(row.createdAt) : row.createdAt
  }
}

const dbHelper = {
  task: {
    async findMany(args: any = {}) {
      const db = getD1()
      if (!db) return []
      let sql = 'SELECT * FROM Task'
      const conditions: string[] = []
      const params: any[] = []

      if (args.where) {
        if (args.where.assignee !== undefined) {
          if (typeof args.where.assignee === 'object' && args.where.assignee.not) {
            conditions.push('assignee != ?')
            params.push(args.where.assignee.not)
          } else {
            conditions.push('assignee = ?')
            params.push(args.where.assignee)
          }
        }
        if (args.where.region) {
          conditions.push('region = ?')
          params.push(args.where.region)
        }
        if (args.where.date) {
          if (typeof args.where.date === 'string') {
            conditions.push('date LIKE ?')
            params.push(`${args.where.date}%`)
          } else if (args.where.date instanceof Date) {
            conditions.push('date = ?')
            params.push(args.where.date.toISOString())
          }
        }
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }

      if (args.orderBy) {
        if (Array.isArray(args.orderBy)) {
          const orders = args.orderBy.map((o: any) => {
            const k = Object.keys(o)[0]
            return `\`${k}\` ${o[k].toUpperCase()}`
          })
          sql += ' ORDER BY ' + orders.join(', ')
        } else if (typeof args.orderBy === 'object') {
          const k = Object.keys(args.orderBy)[0]
          sql += ` ORDER BY \`${k}\` ${args.orderBy[k].toUpperCase()}`
        }
      }

      const res = await db.prepare(sql).bind(...params).all()
      return (res.results || []).map(formatTask)
    },

    async findUnique(args: any) {
      const db = getD1()
      if (!db) return null
      const res = await db.prepare('SELECT * FROM Task WHERE id = ?').bind(args.where.id).first()
      return formatTask(res)
    },

    async create(args: any) {
      const db = getD1()
      if (!db) return null
      const d = args.data
      const id = d.id || crypto.randomUUID()
      const now = new Date().toISOString()
      const dateVal = d.date instanceof Date ? d.date.toISOString() : (d.date || now)

      await db.prepare(`
        INSERT INTO Task (id, createdAt, date, region, admin, details, customerName, phone, location, time, assignee, \`order\`, lift, liftPlate, driverName, startTime, car, info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        now,
        dateVal,
        d.region || '',
        d.admin || '',
        d.details || '',
        d.customerName || null,
        d.phone || null,
        d.location || null,
        d.time || null,
        d.assignee || 'รอแพลน',
        d.order || 0,
        d.lift ? 1 : 0,
        d.liftPlate || null,
        d.driverName || null,
        d.startTime || null,
        d.car || null,
        d.info || null
      ).run()

      const res = await db.prepare('SELECT * FROM Task WHERE id = ?').bind(id).first()
      return formatTask(res)
    },

    async update(args: any) {
      const db = getD1()
      if (!db) return null
      const { id } = args.where
      const d = args.data
      const setClauses: string[] = []
      const params: any[] = []

      Object.keys(d).forEach(k => {
        if (d[k] !== undefined) {
          setClauses.push(`\`${k}\` = ?`)
          if (k === 'lift') {
            params.push(d[k] ? 1 : 0)
          } else if (k === 'date' && d[k] instanceof Date) {
            params.push(d[k].toISOString())
          } else {
            params.push(d[k])
          }
        }
      })

      if (setClauses.length > 0) {
        params.push(id)
        await db.prepare(`UPDATE Task SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params).run()
      }

      const res = await db.prepare('SELECT * FROM Task WHERE id = ?').bind(id).first()
      return formatTask(res)
    },

    async delete(args: any) {
      const db = getD1()
      if (!db) return null
      await db.prepare('DELETE FROM Task WHERE id = ?').bind(args.where.id).run()
      return { id: args.where.id }
    },

    async deleteMany(args: any = {}) {
      const db = getD1()
      if (!db) return { count: 0 }
      if (args.where && args.where.id && Array.isArray(args.where.id.in)) {
        const ids = args.where.id.in
        if (ids.length === 0) return { count: 0 }
        const placeholders = ids.map(() => '?').join(',')
        await db.prepare(`DELETE FROM Task WHERE id IN (${placeholders})`).bind(...ids).run()
        return { count: ids.length }
      }
      return { count: 0 }
    }
  },

  staff: {
    async findMany(args: any = {}) {
      const db = getD1()
      if (!db) return []
      let sql = 'SELECT * FROM Staff'
      const params: any[] = []
      if (args.where && args.where.region) {
        sql += ' WHERE region = ?'
        params.push(args.where.region)
      }
      const res = await db.prepare(sql).bind(...params).all()
      return (res.results || []).map(formatStaff)
    },

    async findUnique(args: any) {
      const db = getD1()
      if (!db) return null
      let sql = 'SELECT * FROM Staff WHERE '
      const params: any[] = []
      if (args.where.id) {
        sql += 'id = ?'
        params.push(args.where.id)
      } else if (args.where.name) {
        sql += 'name = ?'
        params.push(args.where.name)
      } else {
        return null
      }
      const res = await db.prepare(sql).bind(...params).first()
      return formatStaff(res)
    },

    async create(args: any) {
      const db = getD1()
      if (!db) return null
      const d = args.data
      const id = d.id || crypto.randomUUID()
      await db.prepare('INSERT INTO Staff (id, region, name, startTime, carPlate) VALUES (?, ?, ?, ?, ?)')
        .bind(id, d.region || '', d.name || '', d.startTime || null, d.carPlate || null).run()
      const res = await db.prepare('SELECT * FROM Staff WHERE id = ?').bind(id).first()
      return formatStaff(res)
    },

    async update(args: any) {
      const db = getD1()
      if (!db) return null
      const { id } = args.where
      const d = args.data
      const setClauses: string[] = []
      const params: any[] = []

      Object.keys(d).forEach(k => {
        if (d[k] !== undefined) {
          setClauses.push(`\`${k}\` = ?`)
          params.push(d[k])
        }
      })

      if (setClauses.length > 0) {
        params.push(id)
        await db.prepare(`UPDATE Staff SET ${setClauses.join(', ')} WHERE id = ?`).bind(...params).run()
      }

      const res = await db.prepare('SELECT * FROM Staff WHERE id = ?').bind(id).first()
      return formatStaff(res)
    },

    async delete(args: any) {
      const db = getD1()
      if (!db) return null
      await db.prepare('DELETE FROM Staff WHERE id = ?').bind(args.where.id).run()
      return { id: args.where.id }
    }
  },

  setting: {
    async findUnique(args: any) {
      const db = getD1()
      if (!db) return null
      const res = await db.prepare('SELECT * FROM Setting WHERE key = ?').bind(args.where.key).first()
      return formatSetting(res)
    },

    async create(args: any) {
      const db = getD1()
      if (!db) return null
      const { key, value } = args.data
      await db.prepare('INSERT INTO Setting (key, value) VALUES (?, ?)').bind(key, value).run()
      return { key, value }
    },

    async upsert(args: any) {
      const db = getD1()
      if (!db) return null
      const { key } = args.where
      const val = args.update?.value || args.create?.value || ''
      const existing = await db.prepare('SELECT key FROM Setting WHERE key = ?').bind(key).first()
      if (existing) {
        await db.prepare('UPDATE Setting SET value = ? WHERE key = ?').bind(val, key).run()
      } else {
        await db.prepare('INSERT INTO Setting (key, value) VALUES (?, ?)').bind(key, val).run()
      }
      return { key, value: val }
    }
  },

  editRequest: {
    async findMany(args: any = {}) {
      const db = getD1()
      if (!db) return []
      let sql = 'SELECT * FROM EditRequest'
      const params: any[] = []
      if (args.where && args.where.status) {
        sql += ' WHERE status = ?'
        params.push(args.where.status)
      }
      sql += ' ORDER BY createdAt DESC'
      const res = await db.prepare(sql).bind(...params).all()
      return (res.results || []).map(formatEditRequest)
    },

    async findUnique(args: any) {
      const db = getD1()
      if (!db) return null
      const res = await db.prepare('SELECT * FROM EditRequest WHERE id = ?').bind(args.where.id).first()
      return formatEditRequest(res)
    },

    async create(args: any) {
      const db = getD1()
      if (!db) return null
      const d = args.data
      const id = d.id || crypto.randomUUID()
      const now = new Date().toISOString()
      await db.prepare('INSERT INTO EditRequest (id, taskId, originalFields, requestedFields, status, admin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, d.taskId, d.originalFields, d.requestedFields, d.status || 'PENDING', d.admin, now).run()
      const res = await db.prepare('SELECT * FROM EditRequest WHERE id = ?').bind(id).first()
      return formatEditRequest(res)
    },

    async delete(args: any) {
      const db = getD1()
      if (!db) return null
      await db.prepare('DELETE FROM EditRequest WHERE id = ?').bind(args.where.id).run()
      return { id: args.where.id }
    }
  },

  async $transaction(promises: Promise<any>[]) {
    return Promise.all(promises)
  },

  async $executeRaw(strings: TemplateStringsArray, ...values: any[]) {
    const db = getD1()
    if (!db) return 0
    let query = strings[0]
    for (let i = 1; i < strings.length; i++) {
      query += '?' + strings[i]
    }
    const res = await db.prepare(query).bind(...values).run()
    return res.meta?.changes || 1
  }
}

export default dbHelper as any
