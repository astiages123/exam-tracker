import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 require a driver adapter for direct database connections in Node.js
// This file should ONLY be used in Node.js environments (server, scripts, pipeline)
if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be used in the browser.')
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma
