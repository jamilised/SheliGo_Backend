import { Pool } from 'pg'
import config from '../configs/db-config.js'

export const pool = new Pool(config)

pool.on('error', (error) => {
    console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error)
})

class DbPg {
    getDBPool = (): Pool => pool

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