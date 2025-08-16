import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  // Blockchain
  KAIA_RPC_URL: Joi.string().required(),
  HACKATHON_REGISTRY_ADDRESS: Joi.string().required(),
  PRIZE_POOL_ADDRESS: Joi.string().required(),

  // Optional services
  REDIS_URL: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().default('*'),
});

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  blockchain: {
    kaiaRpcUrl: string;
    hackathonRegistryAddress: string;
    prizePoolAddress: string;
  };
  redis?:
    | {
        url: string;
      }
    | undefined;
  cors: {
    origin: string;
  };
}

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

export const getAppConfig = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: getRequiredEnv('DATABASE_URL'),
  },
  jwt: {
    secret: getRequiredEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  blockchain: {
    kaiaRpcUrl: getRequiredEnv('KAIA_RPC_URL'),
    hackathonRegistryAddress: getRequiredEnv('HACKATHON_REGISTRY_ADDRESS'),
    prizePoolAddress: getRequiredEnv('PRIZE_POOL_ADDRESS'),
  },
  redis: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
});
