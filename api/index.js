import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { ensureDb } from '../server/db.js'
import authRouter from '../server/routes/auth.js'
import notesRouter from '../server/routes/notes.js'
import categoriesRouter from '../server/routes/categories.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Middleware to ensure DB schema before handling requests
app.use(async (req, res, next) => {
  try {
    await ensureDb()
    next()
  } catch (err) {
    next(err)
  }
})

// Mount routers
app.use('/api/auth', authRouter)
app.use('/api/notes', notesRouter)
app.use('/api/categories', categoriesRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Global Error Handler - Always return JSON error
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Vercel Serverless API Error:', err)
  const status = err.status || err.statusCode || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
  })
})

export default app
