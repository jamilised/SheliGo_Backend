import { Pool } from 'pg'
import type { PoolClient } from 'pg'
import config from '../configs/db-config.js'

export const pool = new Pool(config)

pool.on('error', (error) => {
    console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error)
})

class DbPg {
    getDBPool = (): Pool => pool

    transaction = async <T>(operation: (client: PoolClient) => Promise<T>): Promise<T> => {
        const client = await pool.connect()
        let transactionStarted = false

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
                    throw new AggregateError(
                        [error, rollbackError],
                        'La transacción falló y no se pudo revertir.'
                    )
                }
            }

            throw error
        } finally {
            client.release()
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