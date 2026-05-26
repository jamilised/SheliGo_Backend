import express from 'express'
import publicacionesRouter from './routers/publicaciones-router.js'
import headerRouter from './routers/header-router.js'
import homeRouter from './routers/home-router.js'

const app = express()

app.use(express.json())

app.use('/publicaciones', publicacionesRouter)
app.use('/header', headerRouter)
app.use('/home', homeRouter)

export default app