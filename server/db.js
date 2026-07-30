import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is missing in process.env')
}

export const sql = neon(DATABASE_URL || '')

let dbInitialized = false

export async function ensureDb() {
  if (dbInitialized || !process.env.DATABASE_URL) return
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
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ DEFAULT NULL
      )
    `

    // Add category_id & deleted_at & is_pinned if table existed before without columns
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    `
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    `
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
    `
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT NULL;
    `

    dbInitialized = true
    console.log('✅ Database ready (categories & notes tables exist)')
  } catch (err) {
    console.error('❌ Database init failed:', err.message)
  }
}
