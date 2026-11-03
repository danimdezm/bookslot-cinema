const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`${name} debe ser numérico`);
  return value;
};

export const config = {
  appEnv: process.env.APP_ENV ?? 'local',
  region: process.env.AWS_REGION ?? 'eu-west-1',
  tableName: process.env.TABLE_NAME ?? 'bookslot-local',
  dynamoEndpoint: process.env.DYNAMODB_ENDPOINT,

  holdTtlMinutes: num('HOLD_TTL_MINUTES', 10),
  maxSeatsPerHold: num('MAX_SEATS_PER_HOLD', 10),
  cancelFreeHours: num('CANCEL_FREE_HOURS', 2),
  reminderHoursBefore: num('REMINDER_HOURS_BEFORE', 24),
  currency: 'eur',

  mailer: (process.env.MAILER ?? 'console') as 'ses' | 'smtp' | 'console',
  fromEmail: process.env.FROM_EMAIL ?? 'BookSlot Cinema <no-reply@bookslot.local>',
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: num('SMTP_PORT', 1025),

  eventBusName: process.env.EVENT_BUS_NAME,
  schedulerGroup: process.env.SCHEDULER_GROUP ?? 'default',
  schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN,
  holdExpirerArn: process.env.HOLD_EXPIRER_ARN,
  reminderArn: process.env.REMINDER_ARN,
  wsManagementEndpoint: process.env.WS_MANAGEMENT_ENDPOINT,
};
