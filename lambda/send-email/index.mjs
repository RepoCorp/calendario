import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createHandler } from './handler.mjs';

// Sending is not idempotent: do not automatically retry an ambiguous SES response.
const ses = new SESv2Client({ maxAttempts: 1 });

export const handler = createHandler({
  sendEmail: (input) => ses.send(new SendEmailCommand(input)),
});
