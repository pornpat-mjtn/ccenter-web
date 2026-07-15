import { PrismaClient } from '@prisma/client/edge'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getRequestContext } from '@cloudflare/next-on-pages'

let cachedPrisma: PrismaClient | null = null

const getPrisma = () => {
  if (cachedPrisma) return cachedPrisma

  if (process.env.NODE_ENV === 'production') {
    try {
      const runtimeContext = getRequestContext()
      if (runtimeContext && runtimeContext.env && (runtimeContext.env as any).DB) {
        const d1Database = (runtimeContext.env as any).DB
        const adapter = new PrismaD1(d1Database)
        cachedPrisma = new PrismaClient({ adapter } as any)
        return cachedPrisma
      } else {
        throw new Error('D1 Database binding "DB" not found in Cloudflare Pages environment variables. Please check your Cloudflare Dashboard Settings > Functions > D1 database bindings.')
      }
    } catch (e) {
      throw e
    }
  }
  cachedPrisma = new PrismaClient()
  return cachedPrisma
}

const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrisma()
    return (client as any)[prop]
  }
})

export default prisma

if (process.env.NODE_ENV !== 'production') (globalThis as any).prismaGlobal = prisma
