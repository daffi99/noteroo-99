import { Router } from 'express'
import { sql } from '../db.js'

const router = Router()

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await sql`
      SELECT c.*, COUNT(n.id)::int as note_count
      FROM categories c
      LEFT JOIN notes n ON n.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `
    res.json(categories)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create category
router.post('/', async (req, res) => {
  try {
    const { name, color = '#7c3aed' } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const [category] = await sql`
      INSERT INTO categories (name, color)
      VALUES (${name.trim()}, ${color})
      RETURNING *
    `
    res.status(201).json(category)
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Category name already exists' })
    }
    res.status(500).json({ error: err.message })
  }
})

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const [category] = await sql`
      UPDATE categories
      SET name = ${name.trim()},
          color = ${color}
      WHERE id = ${req.params.id}
      RETURNING *
    `
    if (!category) return res.status(404).json({ error: 'Category not found' })
    res.json(category)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const [category] = await sql`
      DELETE FROM categories WHERE id = ${req.params.id} RETURNING *
    `
    if (!category) return res.status(404).json({ error: 'Category not found' })
    res.json({ message: 'Category deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
