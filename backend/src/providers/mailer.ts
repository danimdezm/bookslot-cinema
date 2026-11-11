import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import { config } from '../shared/config';
import { log } from '../shared/logger';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

class SesMailer implements Mailer {
  private client = new SESv2Client({ region: config.region });

  async send({ to, subject, text, html }: Email) {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: config.fromEmail,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Text: { Data: text, Charset: 'UTF-8' }, Html: { Data: html, Charset: 'UTF-8' } },
          },
        },
      }),
    );
  }
}

class SmtpMailer implements Mailer {
  private transport = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });

  async send({ to, subject, text, html }: Email) {
    await this.transport.sendMail({ from: config.fromEmail, to, subject, text, html });
  }
}

class ConsoleMailer implements Mailer {
  async send({ to, subject }: Email) {
    log.info('email (console)', { to, subject });
  }
}

export function createMailer(): Mailer {
  switch (config.mailer) {
    case 'ses':
      return new SesMailer();
    case 'smtp':
      return new SmtpMailer();
    default:
      return new ConsoleMailer();
  }
}
