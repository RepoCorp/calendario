import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: JSON.stringify(body),
  };
}

function getAllowedOrigin(requestOrigin) {
  const configuredOrigin = process.env.ALLOWED_ORIGIN ?? '*';
  if (configuredOrigin === '*') return '*';
  return requestOrigin === configuredOrigin ? configuredOrigin : configuredOrigin;
}

function parseBody(event) {
  if (!event.body) return {};

  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function handler(event) {
  const requestOrigin = event.headers?.origin ?? event.headers?.Origin ?? '';
  const responseOrigin = getAllowedOrigin(requestOrigin);

  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return json(204, {}, responseOrigin);
  }

  const body = parseBody(event);
  if (body === null) {
    return json(400, { error: 'Invalid JSON body.' }, responseOrigin);
  }

  const fromEmail = process.env.FROM_EMAIL;
  const toEmail = process.env.TO_EMAIL;

  if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
    return json(
      500,
      { error: 'Lambda is missing valid FROM_EMAIL or TO_EMAIL configuration.' },
      responseOrigin
    );
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const html = typeof body.html === 'string' ? body.html.trim() : '';
  const replyTo = typeof body.replyTo === 'string' ? body.replyTo.trim() : '';
  const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : '';

  if (!subject) {
    return json(400, { error: 'Subject is required.' }, responseOrigin);
  }

  if (!text && !html) {
    return json(400, { error: 'Either text or html content is required.' }, responseOrigin);
  }

  if (replyTo && !isValidEmail(replyTo)) {
    return json(400, { error: 'replyTo must be a valid email address.' }, responseOrigin);
  }

  const finalSubject = senderName ? `[Mi Familita] ${senderName}: ${subject}` : `[Mi Familita] ${subject}`;

  const command = new SendEmailCommand({
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: {
          Data: finalSubject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: text
            ? {
                Data: text,
                Charset: 'UTF-8',
              }
            : undefined,
          Html: html
            ? {
                Data: html,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
    },
  });

  try {
    const response = await ses.send(command);

    return json(
      200,
      {
        ok: true,
        messageId: response.MessageId,
      },
      responseOrigin
    );
  } catch (error) {
    console.error('send-email failed', error);

    return json(
      502,
      {
        error: 'Failed to send email.',
      },
      responseOrigin
    );
  }
}
