import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { ensureDb } from './db.js'
import notesRouter from './routes/notes.js'
import categoriesRouter from './routes/categories.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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
ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`)
  })
})
