import { Router, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'

import InstitucionesService from './../services/instituciones-service.js'
import Institucion from './../entities/institucion.js'

const router = Router()

const currentService = new InstitucionesService()



router.get('', async (req: Request, res: Response) => {

    try {

        console.log('InstitucionesController.get')

        const returnArray = await currentService.getAllAsync()

        if (returnArray != null) {

            res.status(StatusCodes.OK).json(returnArray)

        } else {

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Error interno.')

        }

    } catch (error: any) {

        console.log(error)

        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send(`Error: ${error.message}`)

    }

})



router.get('/:id', async (req: Request, res: Response) => {

    try {

        const id = parseInt(req.params.id)

        const returnEntity = await currentService.getByIdAsync(id)

        if (returnEntity != null) {

            res.status(StatusCodes.OK).json(returnEntity)

        } else {

            res
                .status(StatusCodes.NOT_FOUND)
                .send(`No se encontro la entidad (id:${id}).`)

        }

    } catch (error: any) {

        console.log(error)

        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send(`Error: ${error.message}`)

    }

})



router.post('', async (req: Request, res: Response) => {

    try {

        const entity: Institucion = req.body

        const newId = await currentService.createAsync(entity)

        if (newId > 0) {

            res.status(StatusCodes.CREATED).json(newId)

        } else {

            res.status(StatusCodes.BAD_REQUEST).json(null)

        }

    } catch (error: any) {

        console.log(error)

        res
            .status(StatusCodes.BAD_REQUEST)
            .send(`Error: ${error.message}`)

    }

})



router.put('/:id', async (req: Request, res: Response) => {

    try {

        const id = parseInt(req.params.id)

        const entity: Institucion = req.body

        if (entity.id && entity.id !== id) {

            return res
                .status(StatusCodes.BAD_REQUEST)
                .send(`El id de la URL (${id}) no coincide con el id del body (${entity.id}).`)

        }

        entity.id = id

        const rowsAffected = await currentService.updateAsync(entity)

        if (rowsAffected != 0) {

            res.status(StatusCodes.OK).json(rowsAffected)

        } else {

            res
                .status(StatusCodes.NOT_FOUND)
                .send(`No se encontro la entidad (id:${id}).`)

        }

    } catch (error: any) {

        console.log(error)

        res
            .status(StatusCodes.BAD_REQUEST)
            .send(`Error: ${error.message}`)

    }

})



router.delete('/:id', async (req: Request, res: Response) => {

    try {

        const id = parseInt(req.params.id)

        const rowCount = await currentService.deleteByIdAsync(id)

        if (rowCount != 0) {

            res.status(StatusCodes.OK).json(null)

        } else {

            res
                .status(StatusCodes.NOT_FOUND)
                .send(`No se encontro la entidad (id:${id}).`)

        }

    } catch (error: any) {

        console.log(error)

        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .send(`Error: ${error.message}`)

    }

})



export default router