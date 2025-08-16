import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  provider: process.env.DB_PROVIDER || 'sqlite',
}))

export const databaseConfigValidation = {
  DATABASE_URL: Joi.string().required(),
  DB_PROVIDER: Joi.string().valid('sqlite', 'postgresql').default('sqlite'),
}