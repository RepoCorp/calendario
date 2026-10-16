const MAX_BODY_BYTES = 64 * 1024;
const HEADER_CONTROLS = /[\u0000-\u001f\u007f]/;

function isValidEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && value.split('@')[0].length <= 64
    && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(value);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

// The injectable transport keeps tests entirely offline, without AWS credentials.
export function createHandler({ sendEmail, env = process.env, logger = console }) {
  return async function handler(event = {}) {
    const headers = Object.fromEntries(
      Object.entries(event.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])
    );
    const allowedOrigin = env.ALLOWED_ORIGIN ?? 'https://mifamilita.com';
    const originAllowed = !headers.origin || headers.origin === allowedOrigin;
    const respond = (statusCode, body, extraHeaders = {}) => ({
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
        ...(originAllowed ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        ...extraHeaders,
      },
      body: statusCode === 204 ? '' : JSON.stringify(body),
    });

    // CORS alone does not stop a POST reaching Lambda. Reject other browser origins
    // before sending; this is not authentication for non-browser callers.
    if (!originAllowed) {
      return respond(403, { error: 'No se permite enviar desde esta pagina.' });
    }

    const method = event.requestContext?.http?.method ?? event.httpMethod;
    if (method === 'OPTIONS') return respond(204);
    if (method !== 'POST') {
      return respond(405, { error: 'Usen POST para enviar el correo.' }, { Allow: 'OPTIONS, POST' });
    }
    if (headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return respond(415, { error: 'El mensaje debe enviarse como JSON.' });
    }

    let body;
    try {
      if (typeof event.body !== 'string' || !event.body) throw new Error('Missing body');
      const maxEncodedBytes = event.isBase64Encoded ? Math.ceil(MAX_BODY_BYTES / 3) * 4 : MAX_BODY_BYTES;
      if (Buffer.byteLength(event.body, 'utf8') > maxEncodedBytes) {
        return respond(413, { error: 'El mensaje es demasiado largo.' });
      }
      if (event.isBase64Encoded && !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.body)) {
        throw new Error('Invalid base64');
      }
      const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
      if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
        return respond(413, { error: 'El mensaje es demasiado largo.' });
      }
      body = JSON.parse(rawBody);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    } catch {
      return respond(400, { error: 'No se pudo leer el mensaje. Revisen los datos.' });
    }

    // Accept text from older cached Day 12 builds, but never trust client HTML.
    const legacyText = body.message === undefined;
    const rawMessage = legacyText ? body.text : body.message;
    if (typeof body.senderName !== 'string' || typeof body.subject !== 'string'
      || typeof rawMessage !== 'string'
      || (body.replyTo !== undefined && typeof body.replyTo !== 'string')) {
      return respond(400, { error: 'Pongan su nombre, un asunto y un mensaje antes de enviarlo.' });
    }
    if ([body.senderName, body.subject, body.replyTo ?? ''].some((value) => HEADER_CONTROLS.test(value))) {
      return respond(400, { error: 'Revisen el nombre, el asunto y el correo para responder.' });
    }

    const senderName = body.senderName.trim();
    const subject = body.subject.trim();
    const message = rawMessage.trim().replace(/\r\n?/g, '\n');
    const replyTo = (body.replyTo ?? '').trim();
    if (!senderName || !subject || !message) {
      return respond(400, { error: 'Pongan su nombre, un asunto y un mensaje antes de enviarlo.' });
    }
    if (senderName.length > 100 || subject.length > 200 || message.length > 10000 || replyTo.length > 254) {
      return respond(400, { error: 'El nombre, el asunto o el mensaje es demasiado largo.' });
    }
    if (replyTo && !isValidEmail(replyTo)) {
      return respond(400, { error: 'Revisen el correo para responder.' });
    }

    const fromEmail = env.FROM_EMAIL?.trim();
    const toEmail = env.TO_EMAIL?.trim();
    if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
      return respond(503, { error: 'El correo no esta disponible por ahora. Intenten mas tarde.' });
    }

    const text = legacyText ? message : `${message}\n\nDe: ${senderName}`;
    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
      ${legacyText ? '' : `<p><strong>De:</strong> ${escapeHtml(senderName)}</p>`}
      ${replyTo ? `<p><strong>Responder a:</strong> ${escapeHtml(replyTo)}</p>` : ''}
    </div>`;

    try {
      const result = await sendEmail({
        FromEmailAddress: fromEmail,
        Destination: { ToAddresses: [toEmail] },
        ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
        Content: {
          Simple: {
            Subject: { Data: `[Mi Familita] ${senderName}: ${subject}`, Charset: 'UTF-8' },
            Body: {
              Text: { Data: text, Charset: 'UTF-8' },
              Html: { Data: html, Charset: 'UTF-8' },
            },
          },
        },
      });
      if (!result?.MessageId) throw new Error('Missing SES message ID');
      return respond(200, { ok: true, messageId: result.MessageId });
    } catch (error) {
      // Do not log the message, email addresses, or the provider's full error.
      logger.error('send-email failed', {
        name: error?.name ?? 'Error',
        requestId: event.requestContext?.requestId,
      });
      return respond(502, { error: 'No se pudo enviar el correo. Intenten de nuevo mas tarde.' });
    }
  };
}
