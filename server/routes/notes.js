import { Router } from 'express'
import { sql } from '../index.js'

const router = Router()

// GET all notes with category info
router.get('/', async (req, res) => {
  try {
    const notes = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      ORDER BY n.updated_at DESC
    `
    res.json(notes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single note
router.get('/:id', async (req, res) => {
  try {
    const [note] = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = ${req.params.id}
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json(note)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create note
router.post('/', async (req, res) => {
  try {
    const { title = 'Untitled', content = null, color = 'orange', category_id = null } = req.body
    const [created] = await sql`
      INSERT INTO notes (title, content, color, category_id)
      VALUES (${title}, ${content ? JSON.stringify(content) : null}::jsonb, ${color}, ${category_id || null})
      RETURNING *
    `
    
    // Fetch full note with category details
    const [note] = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = ${created.id}
    `
    res.status(201).json(note)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT update note
router.put('/:id', async (req, res) => {
  try {
    const { title, content, color, category_id } = req.body
    const [updated] = await sql`
      UPDATE notes
      SET title = ${title},
          content = ${content ? JSON.stringify(content) : null}::jsonb,
          color = ${color},
          category_id = ${category_id || null},
          updated_at = now()
      WHERE id = ${req.params.id}
      RETURNING *
    `
    if (!updated) return res.status(404).json({ error: 'Note not found' })

    // Fetch full note with category details
    const [note] = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = ${updated.id}
    `
    res.json(note)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE note
router.delete('/:id', async (req, res) => {
  try {
    const [note] = await sql`
      DELETE FROM notes WHERE id = ${req.params.id} RETURNING *
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
