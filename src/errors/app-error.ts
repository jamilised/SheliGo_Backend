export default class AppError extends Error {
  statusCode: number
  // Detalle por campo (validaciones): el frontend marca cada campo con error
  errors?: Array<{ path: Array<string | number>; message: string }>

  constructor(message: string, statusCode = 500, errors?: AppError['errors']) {
    super(message)
    this.statusCode = statusCode
    if (errors) {
      this.errors = errors
    }
  }
}