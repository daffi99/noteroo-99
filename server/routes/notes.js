import { Router } from 'express'
import { sql } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Require authentication for all note routes
router.use(authenticate)

// GET active notes for authenticated user strictly
router.get('/', async (req, res) => {
  try {
    const notes = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.deleted_at IS NULL AND n.user_id = ${req.user.id}
      ORDER BY n.is_pinned DESC, n.pinned_at ASC NULLS LAST, n.updated_at DESC
    `
    res.json(notes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET trashed notes strictly for authenticated user
router.get('/trash', async (req, res) => {
  try {
    // Purge notes in trash for > 30 days for this user
    await sql`
      DELETE FROM notes 
      WHERE deleted_at IS NOT NULL 
        AND user_id = ${req.user.id}
        AND deleted_at < NOW() - INTERVAL '30 days'
    `

    const trashedNotes = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.deleted_at IS NOT NULL AND n.user_id = ${req.user.id}
      ORDER BY n.deleted_at DESC
    `
    res.json(trashedNotes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single note strictly for authenticated user
router.get('/:id', async (req, res) => {
  try {
    const [note] = await sql`
      SELECT 
        n.*,
        c.name as category_name,
        c.color as category_color
      FROM notes n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = ${req.params.id} AND n.user_id = ${req.user.id}
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json(note)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create note for authenticated user
router.post('/', async (req, res) => {
  try {
    const { title = 'Untitled', content = null, color = 'orange', category_id = null, is_pinned = false } = req.body
    if (is_pinned) {
      const [{ count }] = await sql`
        SELECT count(*)::int as count FROM notes 
        WHERE is_pinned = true AND deleted_at IS NULL AND user_id = ${req.user.id}
      `
      if (count >= 3) {
        return res.status(400).json({ error: 'Maximum limit of 3 pinned notes reached' })
      }
    }

    const [created] = await sql`
      INSERT INTO notes (title, content, color, category_id, user_id, is_pinned, pinned_at)
      VALUES (
        ${title},
        ${content ? JSON.stringify(content) : null}::jsonb,
        ${color},
        ${category_id || null},
        ${req.user.id},
        ${Boolean(is_pinned)},
        ${is_pinned ? sql`now()` : null}
      )
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

// PUT update note strictly for authenticated user
router.put('/:id', async (req, res) => {
  try {
    const { title, content, color, category_id, is_pinned } = req.body

    if (is_pinned === true) {
      const [{ count }] = await sql`
        SELECT count(*)::int as count FROM notes 
        WHERE is_pinned = true AND deleted_at IS NULL AND id != ${req.params.id} AND user_id = ${req.user.id}
      `
      if (count >= 3) {
        return res.status(400).json({ error: 'Maximum limit of 3 pinned notes reached' })
      }
    }

    const [existingNote] = await sql`
      SELECT * FROM notes WHERE id = ${req.params.id} AND user_id = ${req.user.id}
    `
    if (!existingNote) return res.status(404).json({ error: 'Note not found' })

    const updatedTitle = title !== undefined ? title : existingNote.title
    const updatedContent = content !== undefined ? content : existingNote.content
    const updatedColor = color !== undefined ? color : existingNote.color
    const updatedCategoryId = category_id !== undefined ? category_id : existingNote.category_id
    const updatedIsPinned = is_pinned !== undefined ? Boolean(is_pinned) : Boolean(existingNote.is_pinned)

    let pinnedAtValue = existingNote.pinned_at
    if (updatedIsPinned && !existingNote.is_pinned) {
      pinnedAtValue = new Date().toISOString()
    } else if (!updatedIsPinned && existingNote.is_pinned) {
      pinnedAtValue = null
    }

    const [updated] = await sql`
      UPDATE notes
      SET title = ${updatedTitle},
          content = ${updatedContent ? JSON.stringify(updatedContent) : null}::jsonb,
          color = ${updatedColor},
          category_id = ${updatedCategoryId || null},
          user_id = ${req.user.id},
          is_pinned = ${updatedIsPinned},
          pinned_at = ${pinnedAtValue},
          updated_at = now()
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *
    `

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

// PUT restore note from trash strictly for authenticated user
router.put('/:id/restore', async (req, res) => {
  try {
    const [restored] = await sql`
      UPDATE notes
      SET deleted_at = NULL
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *
    `
    if (!restored) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note restored', note: restored })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE empty trash strictly for authenticated user
router.delete('/trash/empty', async (req, res) => {
  try {
    await sql`
      DELETE FROM notes WHERE deleted_at IS NOT NULL AND user_id = ${req.user.id}
    `
    res.json({ message: 'Trash emptied' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE note permanently from trash strictly for authenticated user
router.delete('/:id/permanent', async (req, res) => {
  try {
    const [note] = await sql`
      DELETE FROM notes WHERE id = ${req.params.id} AND user_id = ${req.user.id} RETURNING *
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note permanently deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE move note to trash (soft delete) strictly for authenticated user
router.delete('/:id', async (req, res) => {
  try {
    const [note] = await sql`
      UPDATE notes SET deleted_at = NOW() WHERE id = ${req.params.id} AND user_id = ${req.user.id} RETURNING *
    `
    if (!note) return res.status(404).json({ error: 'Note not found' })
    res.json({ message: 'Note moved to trash' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
