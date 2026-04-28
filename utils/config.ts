import 'dotenv/config';

export const ENV_CONFIG = {
  baseUrl: process.env.BASE_URL ?? 'https://www.henryschein.co.uk',
  domain: (process.env.DOMAIN ?? 'UK Medical') as 'UK Medical' | 'UK Dental' | 'Ireland Dental',
  env: process.env.ENV ?? 'staging',
  headless: process.env.HEADLESS !== 'false',
};
