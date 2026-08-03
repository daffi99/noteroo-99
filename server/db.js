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
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT DEFAULT '',
        avatar_url TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // Create categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#7c3aed',
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `

    // Create notes table
    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content JSONB DEFAULT NULL,
        color TEXT DEFAULT 'orange',
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        is_pinned BOOLEAN DEFAULT FALSE,
        pinned_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ DEFAULT NULL
      )
    `

    // Add user_id column if tables existed before without columns
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
    `
    await sql`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `
    await sql`
      ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
    `
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `
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

    // Migrate orphaned notes & categories (where user_id IS NULL) to daffiyashir@gmail.com
    await sql`
      UPDATE notes
      SET user_id = (SELECT id FROM users WHERE email = 'daffiyashir@gmail.com' LIMIT 1)
      WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE email = 'daffiyashir@gmail.com')
    `
    await sql`
      UPDATE categories
      SET user_id = (SELECT id FROM users WHERE email = 'daffiyashir@gmail.com' LIMIT 1)
      WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE email = 'daffiyashir@gmail.com')
    `

    dbInitialized = true
    console.log('✅ Database ready (users, categories & notes tables exist)')
  } catch (err) {
    console.error('❌ Database init failed:', err.message)
  }
}

// Function to seed default categories for a new user
export async function seedUserCategories(userId) {
  try {
    const existingCat = await sql`SELECT count(*)::int as count FROM categories WHERE user_id = ${userId}`
    if (existingCat[0].count === 0) {
      await sql`
        INSERT INTO categories (name, color, user_id) VALUES
        ('Personal', '#3b82f6', ${userId}),
        ('Work', '#ef4444', ${userId}),
        ('Ideas', '#10b981', ${userId}),
        ('Tasks', '#f59e0b', ${userId})
      `
    }
  } catch (err) {
    console.error('Error seeding categories for user:', err)
  }
}
