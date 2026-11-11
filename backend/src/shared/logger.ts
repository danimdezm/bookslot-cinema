type Fields = Record<string, unknown>;
type Level = 'debug' | 'info' | 'warn' | 'error';

const write = (level: Level, msg: string, fields?: Fields) => {
  if (level === 'debug' && !process.env.DEBUG) return;
  const line = JSON.stringify({ level, msg, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
};

const errorFields = (err: unknown): Fields =>
  err instanceof Error ? { error: err.message, errorName: err.name, stack: err.stack } : { error: String(err) };

export const log = {
  debug: (msg: string, fields?: Fields) => write('debug', msg, fields),
  info: (msg: string, fields?: Fields) => write('info', msg, fields),
  warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
  error: (msg: string, err?: unknown, fields?: Fields) =>
    write('error', msg, { ...fields, ...(err === undefined ? {} : errorFields(err)) }),
};
