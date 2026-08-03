import { Router } from 'express'
import { sql } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Require authentication for all category routes
router.use(authenticate)

// GET all categories for authenticated user strictly
router.get('/', async (req, res) => {
  try {
    const categories = await sql`
      SELECT c.*, COUNT(n.id)::int as note_count
      FROM categories c
      LEFT JOIN notes n ON n.category_id = c.id AND n.deleted_at IS NULL
      WHERE c.user_id = ${req.user.id}
      GROUP BY c.id
      ORDER BY c.name ASC
    `
    res.json(categories)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create category for authenticated user strictly
router.post('/', async (req, res) => {
  try {
    const { name, color = '#7c3aed' } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const cleanName = name.trim()

    // Check if duplicate for user
    const existing = await sql`
      SELECT id FROM categories 
      WHERE LOWER(name) = LOWER(${cleanName}) AND user_id = ${req.user.id}
    `
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category name already exists' })
    }

    const [category] = await sql`
      INSERT INTO categories (name, color, user_id)
      VALUES (${cleanName}, ${color}, ${req.user.id})
      RETURNING *
    `
    res.status(201).json(category)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update category strictly for authenticated user
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const [category] = await sql`
      UPDATE categories
      SET name = ${name.trim()},
          color = ${color},
          user_id = ${req.user.id}
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *
    `
    if (!category) return res.status(404).json({ error: 'Category not found' })
    res.json(category)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE category strictly for authenticated user
router.delete('/:id', async (req, res) => {
  try {
    const [category] = await sql`
      DELETE FROM categories WHERE id = ${req.params.id} AND user_id = ${req.user.id} RETURNING *
    `
    if (!category) return res.status(404).json({ error: 'Category not found' })
    res.json({ message: 'Category deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
