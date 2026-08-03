import express from 'express'
import bcrypt from 'bcryptjs'
import { sql, seedUserCategories } from '../db.js'
import { authenticate, generateToken, COOKIE_OPTIONS } from '../middleware/auth.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, avatar_url } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)
    const userName = (name || '').trim()

    // Insert user
    const [user] = await sql`
      INSERT INTO users (email, password_hash, name, avatar_url)
      VALUES (${cleanEmail}, ${password_hash}, ${userName}, ${avatar_url || null})
      RETURNING id, email, name, avatar_url, created_at
    `

    // Seed default categories for new user
    await seedUserCategories(user.id)

    // Generate 30-day token
    const token = generateToken({ id: user.id, email: user.email, name: user.name })

    // Set HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS)

    res.status(201).json({
      message: 'Account registered successfully',
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      token,
    })
  } catch (err) {
    console.error('Error in /api/auth/register:', err)
    res.status(500).json({ error: 'Failed to register account' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Find user
    const [user] = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Seed categories if user has none
    await seedUserCategories(user.id)

    // Generate 30-day token
    const token = generateToken({ id: user.id, email: user.email, name: user.name })

    // Set HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS)

    res.json({
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
      token,
    })
  } catch (err) {
    console.error('Error in /api/auth/login:', err)
    res.status(500).json({ error: 'Failed to log in' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  res.json({ message: 'Logged out successfully' })
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, email, name, avatar_url, created_at 
      FROM users 
      WHERE id = ${req.user.id} OR email = ${req.user.email}
    `
    if (!user) {
      return res.status(401).json({ error: 'User not found or session expired' })
    }
    res.json({ user })
  } catch (err) {
    console.error('Error in /api/auth/me:', err)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// PUT /api/auth/profile - Update Profile (Name & Avatar Photo)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar_url } = req.body

    const [existing] = await sql`
      SELECT * FROM users WHERE id = ${req.user.id} OR email = ${req.user.email}
    `
    if (!existing) {
      return res.status(401).json({ error: 'Session expired. Please log out and log in again.' })
    }

    const updatedName = name !== undefined ? name.trim() : existing.name
    const updatedAvatar = avatar_url !== undefined ? avatar_url : existing.avatar_url

    const [user] = await sql`
      UPDATE users
      SET name = ${updatedName},
          avatar_url = ${updatedAvatar}
      WHERE id = ${existing.id}
      RETURNING id, email, name, avatar_url, created_at
    `

    res.json({
      message: 'Profile updated successfully',
      user,
    })
  } catch (err) {
    console.error('Error in /api/auth/profile:', err)
    res.status(500).json({ error: err.message || 'Failed to update profile' })
  }
})

export default router
