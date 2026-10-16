import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from './handler.mjs';

const env = {
  FROM_EMAIL: 'sender@example.com',
  TO_EMAIL: 'family@example.com',
  ALLOWED_ORIGIN: 'https://mifamilita.com',
};

const validBody = {
  senderName: 'María',
  subject: 'Un abrazo',
  message: 'Te quiero mucho.\nNos vemos pronto 💌',
};

function event(body = validBody, overrides = {}) {
  return {
    requestContext: { http: { method: 'POST' } },
    headers: {
      origin: env.ALLOWED_ORIGIN,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
    ...overrides,
  };
}

function setup(options = {}) {
  const sent = [];
  const logged = [];
  const handler = createHandler({
    env: options.env ?? env,
    sendEmail: async (input) => {
      sent.push(input);
      if (options.failure) throw options.failure;
      return { MessageId: 'ses-message-id' };
    },
    logger: { error: (...args) => logged.push(args) },
  });
  return { handler, sent, logged };
}

async function rejected(request, statusCode, options) {
  const { handler, sent } = setup(options);
  const response = await handler(request);
  assert.equal(response.statusCode, statusCode);
  assert.equal(typeof JSON.parse(response.body).error, 'string');
  assert.equal(sent.length, 0, 'invalid requests must not reach SES');
  return response;
}

test('HTTP API v2 and REST API v1 accept valid JSON and return the SES message ID', async () => {
  for (const request of [
    event(),
    event(validBody, {
      requestContext: {},
      httpMethod: 'POST',
      headers: { Origin: env.ALLOWED_ORIGIN, 'Content-Type': 'application/json' },
    }),
  ]) {
    const { handler, sent } = setup();
    const response = await handler(request);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true, messageId: 'ses-message-id' });
    assert.equal(sent.length, 1);
    assert.equal(response.headers['Access-Control-Allow-Origin'], env.ALLOWED_ORIGIN);
  }
});

test('preflight returns 204 and unsupported methods never send email', async () => {
  const { handler, sent } = setup();
  const response = await handler(event(undefined, {
    requestContext: { http: { method: 'OPTIONS' } },
    body: '',
  }));
  assert.equal(response.statusCode, 204);
  assert.equal(sent.length, 0);
  await rejected(event(validBody, { requestContext: { http: { method: 'GET' } } }), 405);
  await rejected(event(validBody, { requestContext: {}, httpMethod: 'PUT' }), 405);
});

test('unsupported content types and malformed or non-object JSON are rejected', async () => {
  await rejected(event(validBody, {
    headers: { origin: env.ALLOWED_ORIGIN, 'content-type': 'text/plain' },
  }), 415);
  for (const body of ['not-json', '', 'null', '[]', 'true', '"text"']) {
    await rejected(event(undefined, { body }), 400);
  }
});

test('base64 bodies decode Unicode JSON before validation', async () => {
  const { handler, sent } = setup();
  const response = await handler(event(undefined, {
    body: Buffer.from(JSON.stringify(validBody), 'utf8').toString('base64'),
    isBase64Encoded: true,
  }));
  assert.equal(response.statusCode, 200);
  assert.ok(sent[0].Content.Simple.Body.Text.Data.includes(validBody.message));
});

test('missing or invalid server addresses return 503 without sending', async () => {
  for (const config of [
    { ...env, FROM_EMAIL: undefined },
    { ...env, TO_EMAIL: undefined },
    { ...env, FROM_EMAIL: 'invalid-address' },
    { ...env, TO_EMAIL: 'invalid-address' },
  ]) {
    await rejected(event(), 503, { env: config });
  }
});

test('mismatched browser origins are rejected while origin-less CLI requests work', async () => {
  await rejected(event(validBody, {
    headers: { origin: 'https://other.example', 'content-type': 'application/json' },
  }), 403);
  const { handler, sent } = setup();
  const response = await handler(event(validBody, {
    headers: { 'content-type': 'application/json' },
  }));
  assert.equal(response.statusCode, 200);
  assert.equal(sent.length, 1);
});

test('senderName, subject, and message are required and must be nonempty strings', async () => {
  for (const field of ['senderName', 'subject', 'message']) {
    for (const value of [undefined, '   ', 42, null]) {
      await rejected(event({ ...validBody, [field]: value }), 400);
    }
  }
});

test('replyTo is optional, validated, and included only when nonempty', async () => {
  for (const replyTo of [undefined, '', '   ']) {
    const { handler, sent } = setup();
    const response = await handler(event({ ...validBody, replyTo }));
    assert.equal(response.statusCode, 200);
    assert.equal(Object.hasOwn(sent[0], 'ReplyToAddresses'), false);
  }
  const { handler, sent } = setup();
  assert.equal((await handler(event({ ...validBody, replyTo: 'reply@example.com' }))).statusCode, 200);
  assert.deepEqual(sent[0].ReplyToAddresses, ['reply@example.com']);
  for (const replyTo of ['not-an-email', 42, null]) {
    await rejected(event({ ...validBody, replyTo }), 400);
  }
});

test('field limits accept the boundary and reject oversized input', async () => {
  const maxReplyTo = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
  assert.equal(maxReplyTo.length, 254);
  const body = {
    senderName: 'n'.repeat(100),
    subject: 's'.repeat(200),
    message: 'm'.repeat(10000),
    replyTo: maxReplyTo,
  };
  const { handler, sent } = setup();
  assert.equal((await handler(event(body))).statusCode, 200);
  assert.equal(sent.length, 1);
  for (const [field, value] of Object.entries(body)) {
    await rejected(event({ ...validBody, [field]: `${value}x` }), 400);
  }
});

test('header values reject CR and LF before trimming', async () => {
  for (const [field, value] of [
    ['senderName', 'María\r\n'],
    ['subject', 'Hola\nBcc: attacker@example.com'],
    ['replyTo', 'reply@example.com\r\nBcc: attacker@example.com'],
  ]) {
    await rejected(event({ ...validBody, [field]: value }), 400);
  }
});

test('the decoded request body has a 64 KiB byte limit', async () => {
  // Unknown fields cannot bypass the overall limit; UTF-8 bytes exceed JS length.
  const body = JSON.stringify({ ...validBody, padding: 'é'.repeat(33000) });
  assert.ok(body.length < 64 * 1024);
  assert.ok(Buffer.byteLength(body, 'utf8') > 64 * 1024);
  await rejected(event(undefined, { body }), 413);
  await rejected(event(undefined, {
    body: Buffer.from(body, 'utf8').toString('base64'),
    isBase64Encoded: true,
  }), 413);
});

test('SES always uses server addresses and escapes user content in HTML', async () => {
  const { handler, sent } = setup();
  const message = 'Te quiero 💌\n<script>alert("hola")</script> & gracias';
  const senderName = 'María <mamá>';
  const response = await handler(event({
    ...validBody,
    senderName,
    message,
    from: 'attacker@example.com',
    to: 'attacker@example.com',
    FromEmailAddress: 'attacker@example.com',
    Destination: { ToAddresses: ['attacker@example.com'] },
    html: '<img src=x onerror="attack()">',
  }));
  assert.equal(response.statusCode, 200);
  const input = sent[0];
  assert.equal(input.FromEmailAddress, env.FROM_EMAIL);
  assert.deepEqual(input.Destination, { ToAddresses: [env.TO_EMAIL] });
  assert.ok(input.Content.Simple.Subject.Data.includes(validBody.subject));
  assert.ok(input.Content.Simple.Subject.Data.includes(senderName));
  const { Text, Html } = input.Content.Simple.Body;
  assert.equal(Text.Charset, 'UTF-8');
  assert.equal(Html.Charset, 'UTF-8');
  assert.ok(Text.Data.includes(message));
  assert.ok(Text.Data.includes(senderName));
  assert.ok(Html.Data.includes('Te quiero 💌'));
  assert.ok(Html.Data.includes('&lt;script&gt;'));
  assert.ok(Html.Data.includes('&amp; gracias'));
  assert.ok(Html.Data.includes('María &lt;mamá&gt;'));
  assert.ok(!Html.Data.includes('<script>'));
  assert.ok(!Html.Data.includes('<img'));
});

test('legacy text is accepted without trusting HTML or duplicating its signature', async () => {
  const { handler, sent } = setup();
  const legacyText = 'Hola <familia> 💌\n\nCon amor,\nMaría';
  const { message, ...body } = validBody;
  const response = await handler(event({ ...body, text: legacyText, html: '<script>unsafe()</script>' }));
  assert.equal(response.statusCode, 200);
  assert.equal(sent[0].Content.Simple.Body.Text.Data, legacyText);
  assert.ok(sent[0].Content.Simple.Body.Html.Data.includes('&lt;familia&gt;'));
  assert.ok(!sent[0].Content.Simple.Body.Html.Data.includes('<script>'));
  await rejected(event({ ...body, text: legacyText, senderName: undefined }), 400);
  await rejected(event({ ...body, text: '   ', html: '<p>HTML only</p>' }), 400);
  await rejected(event({ ...body, text: 'x'.repeat(10001) }), 400);
  await rejected(event({ ...body, message: '', text: legacyText }), 400);
});

test('SES failures return a sanitized 502 response', async () => {
  const { handler, sent } = setup({ failure: new Error('private provider credentials or message') });
  const response = await handler(event());
  assert.equal(response.statusCode, 502);
  assert.equal(sent.length, 1);
  assert.equal(typeof JSON.parse(response.body).error, 'string');
  assert.ok(!response.body.includes('private provider'));
  assert.ok(!response.body.includes('credentials'));
});
