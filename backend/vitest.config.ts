import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      APP_ENV: 'test',
      AWS_REGION: 'eu-west-1',
      DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
      MAILER: 'console',
    },
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
