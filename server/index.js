import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import notesRouter from './routes/notes.js'
import categoriesRouter from './routes/categories.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Validate env
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in .env file')
  console.error('   Add: DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require')
  process.exit(1)
}

// Create Neon SQL client
export const sql = neon(DATABASE_URL)

// Auto-create tables on startup
async function initDb() {
  try {
    // Create categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#7c3aed',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // Seed default categories if empty
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

    // Create notes table
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

    // Add category_id if table existed before without column
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    `

    console.log('✅ Database ready (categories & notes tables exist)')
  } catch (err) {
    console.error('❌ Database init failed:', err.message)
    process.exit(1)
  }
}

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/notes', notesRouter)
app.use('/api/categories', categoriesRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Init DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`)
  })
})
