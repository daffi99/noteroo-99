import { Router } from 'express'
import { sql } from '../db.js'

const router = Router()

// GET active notes (not trashed)
router.get('/', async (req, res) => {
  try {
    const notes = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.deleted_at IS NULL
      ORDER BY n.updated_at DESC
    `
    res.json(notes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET trashed notes (auto-purges >30 days old notes)
router.get('/trash', async (req, res) => {
  try {
    // Purge notes that have been in trash for over 30 days
    await sql`
      DELETE FROM notes 
      WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
    `

    const trashedNotes = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.deleted_at IS NOT NULL
      ORDER BY n.deleted_at DESC
    `
    res.json(trashedNotes)
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

// PUT restore note from trash
router.put('/:id/restore', async (req, res) => {
  try {
    const [restored] = await sql`
      UPDATE notes
      SET deleted_at = NULL
      WHERE id = ${req.params.id}
      RETURNING *
    `
    if (!restored) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note restored', note: restored })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE empty trash (permanently delete all trashed notes)
router.delete('/trash/empty', async (req, res) => {
  try {
    await sql`
      DELETE FROM notes WHERE deleted_at IS NOT NULL
    `
    res.json({ message: 'Trash emptied' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE note permanently from trash
router.delete('/:id/permanent', async (req, res) => {
  try {
    const [note] = await sql`
      DELETE FROM notes WHERE id = ${req.params.id} RETURNING *
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note permanently deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE move note to trash (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const [note] = await sql`
      UPDATE notes SET deleted_at = NOW() WHERE id = ${req.params.id} RETURNING *
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note moved to trash' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
