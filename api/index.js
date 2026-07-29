import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { ensureDb } from '../server/db.js'
import notesRouter from '../server/routes/notes.js'
import categoriesRouter from '../server/routes/categories.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Middleware to ensure DB schema before handling requests
app.use(async (req, res, next) => {
  await ensureDb()
  next()
})

// Mount routers
app.use('/api/notes', notesRouter)
app.use('/api/categories', categoriesRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

export default app
