import { z } from 'zod'

export const getPublicacionSchema = z.object({
  id: z.string().uuid()
})