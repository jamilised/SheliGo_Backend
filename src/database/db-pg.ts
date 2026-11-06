import pg, { Pool } from 'pg'
import type { PoolClient } from 'pg'
import config from '../configs/db-config.js'

/*
Las columnas de fecha de la base son "timestamp without time zone" y guardan la
hora en UTC (NOW() en Supabase). Por defecto, pg las lee como hora local de la
computadora que corre el backend: en una PC de Argentina quedaban 3 horas en el
futuro, y en Render (UTC) se veían bien. Se leen siempre como UTC.
*/
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (valor) => new Date(`${valor.replace(' ', 'T')}Z`))

// Las columnas "date" (por ejemplo fecha_union) son un día del calendario, sin hora:
// se devuelven tal cual ("2026-11-02") para que ninguna zona horaria las corra de día.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor)

export const pool = new Pool(config)

pool.on('error', (error) => {
    console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error)
})

class DbPg {
    getDBPool = (): Pool => pool

    transaction = async <T>(operation: (client: PoolClient) => Promise<T>): Promise<T> => {
        const client = await pool.connect()
        let transactionStarted = false
        // Si el ROLLBACK falla, la conexión queda en estado dudoso: se descarta en vez de volver al pool
        let conexionRota: Error | undefined

        try {
            await client.query('BEGIN')
            transactionStarted = true

            const result = await operation(client)
            await client.query('COMMIT')
            transactionStarted = false
            return result
        } catch (error) {
            if (transactionStarted) {
                try {
                    await client.query('ROLLBACK')
                } catch (rollbackError) {
                    conexionRota = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError))
                    throw new AggregateError(
                        [error, rollbackError],
                        'La transacción falló y no se pudo revertir.'
                    )
                }
            }

            throw error
        } finally {
            client.release(conexionRota)
        }
    }

    queryAll = async (sql: string, values: any[] | null = null) => {
        const resultPg = values
            ? await pool.query(sql, values)
            : await pool.query(sql)

        return resultPg.rows
    }

    queryOne = async (sql: string, values: any[] | null = null) => {
        const resultPg = values
            ? await pool.query(sql, values)
            : await pool.query(sql)

        return resultPg.rows[0] ?? null
    }

    close = async (): Promise<void> => {
        await pool.end()
    }
}

export default new DbPg()