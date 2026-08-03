import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { ensureDb } from './db.js'
import authRouter from './routes/auth.js'
import notesRouter from './routes/notes.js'
import categoriesRouter from './routes/categories.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/notes', notesRouter)
app.use('/api/categories', categoriesRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Global Error Handler - Always return JSON error
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('API Error:', err)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
  })
})

// Init DB then start server
ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`)
  })
})
