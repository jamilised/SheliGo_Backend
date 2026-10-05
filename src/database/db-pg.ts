import { Pool } from 'pg'
import config from '../configs/db-config.js'
import LogHelper from '../helpers/log-helper.js'

export default class DbPg {

    DBPool: Pool | null

    constructor() {
        this.DBPool = null
    }

    getDBPool = (): Pool => {
        if (this.DBPool == null) {
            this.DBPool = new Pool(config)
        }
        return this.DBPool
    }

    queryAll = async (sql: string, values: any[] | null = null) => {
        try {
            const resultPg = values
                ? await this.getDBPool().query(sql, values)
                : await this.getDBPool().query(sql)

            return resultPg.rows
        } catch (error) {
            if (error instanceof Error) {
                LogHelper.logError(error)
            }
            throw error // Relanzar para que el servicio/controlador capture el fallo de BD
        }
    }

    queryOne = async (sql: string, values: any[] | null = null) => {
        try {
            const resultPg = values
                ? await this.getDBPool().query(sql, values)
                : await this.getDBPool().query(sql)

            if (resultPg.rows.length > 0) {
                return resultPg.rows[0]
            }
            return null
        } catch (error) {
            console.error('ERROR REAL POSTGRES:')
            console.error(error)

            if (error instanceof Error) {
                LogHelper.logError(error)
            }
            throw error // Relanzar para que el servicio/controlador capture el fallo de BD
        }
    }
}