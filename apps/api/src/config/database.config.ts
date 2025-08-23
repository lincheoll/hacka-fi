import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  provider: process.env.DATABASE_PROVIDER || 'sqlite',
}));

export const databaseConfigValidation = {
  DATABASE_URL: Joi.string().required(),
  DATABASE_PROVIDER: Joi.string()
    .valid('sqlite', 'postgresql')
    .default('sqlite'),
};
