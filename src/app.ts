import express from 'express'
import publicacionesRouter
  from './routers/publicaciones.router.js'

const app = express()

app.use(express.json())

app.use('/publicaciones', publicacionesRouter)

export default app




