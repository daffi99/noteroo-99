import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import notesRouter from '../server/routes/notes.js'
import categoriesRouter from '../server/routes/categories.js'

dotenv.config()

const app = express()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in environment variables')
}

export const sql = neon(DATABASE_URL || '')

// Auto-create tables helper
let dbInitialized = false
async function ensureDb() {
  if (dbInitialized || !DATABASE_URL) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#7c3aed',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    const existingCat = await sql`SELECT count(*)::int as count FROM categories`
    if (existingCat[0].count === 0) {
      await sql`
        INSERT INTO categories (name, color) VALUES
        ('Personal', '#3b82f6'),
        ('Work', '#ef4444'),
        ('Ideas', '#10b981'),
        ('Tasks', '#f59e0b')
      `
    }

    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content JSONB DEFAULT NULL,
        color TEXT DEFAULT 'orange',
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `

    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    `

    dbInitialized = true
  } catch (err) {
    console.error('❌ Database init error:', err)
  }
}

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Middleware to ensure DB before handling requests
app.use(async (req, res, next) => {
  await ensureDb()
  next()
})

// Mount routers
app.use('/api/notes', notesRouter)
app.use('/api/categories', categoriesRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

export default app
