import 'dotenv/config'
import { validateEnvironment } from './configs/env-config.js'
import app from './app.js'
import dbPg from './database/db-pg.js'

validateEnvironment()

const PORT = Number(process.env.PORT) || 3000

const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`)
})

let shutdownStarted = false

const shutdown = (signal: NodeJS.Signals) => {
    if (shutdownStarted) {
        return
    }
    shutdownStarted = true

    console.log(`Señal ${signal} recibida. Cerrando servidor y pool de PostgreSQL...`)

    const forceShutdownTimer = setTimeout(() => {
        console.error('Tiempo de cierre agotado; finalizando el proceso.')
        process.exit(1)
    }, 10000)
    forceShutdownTimer.unref()

    server.close((serverError) => {
        if (serverError) {
            console.error('Error al cerrar el servidor HTTP:', serverError)
            process.exitCode = 1
        }

        void dbPg.close()
            .catch((error: unknown) => {
                console.error('Error al cerrar el pool de PostgreSQL:', error)
                process.exitCode = 1
            })
            .finally(() => {
                clearTimeout(forceShutdownTimer)
                process.exit(process.exitCode ?? 0)
            })
    })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))