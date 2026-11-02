try {
  process.loadEnvFile('.env');
} catch {
}

process.env.APP_ENV ??= 'local';
process.env.AWS_REGION ??= 'eu-west-1';
process.env.DYNAMODB_ENDPOINT ??= 'http://localhost:8000';
process.env.TABLE_NAME ??= 'bookslot-local';
process.env.MAILER ??= 'smtp';
process.env.PAYMENT_PROVIDER ??= 'mock';
