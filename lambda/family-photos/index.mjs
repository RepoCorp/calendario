import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const PREFIX = 'family/';

function json(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
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

function sanitizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferCaption(key) {
  const fileName = key.split('/').pop() ?? key;
  const base = fileName.replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export async function handler(event) {
  const requestOrigin = event.headers?.origin ?? event.headers?.Origin ?? '';
  const responseOrigin = getAllowedOrigin(requestOrigin);
  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const bucketName = process.env.FAMILY_BUCKET_NAME;
  const baseUrl = process.env.FAMILY_BUCKET_PUBLIC_BASE_URL;

  if (!bucketName || !baseUrl) {
    return json(500, { error: 'Family photo bucket configuration is missing.' }, responseOrigin);
  }

  if (method === 'OPTIONS') {
    return json(204, {}, responseOrigin);
  }

  if (method === 'GET') {
    try {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: PREFIX,
        })
      );

      const photos = (response.Contents ?? [])
        .filter((item) => item.Key && item.Size && item.Key !== PREFIX)
        .sort((a, b) => {
          const aTime = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const bTime = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return bTime - aTime;
        })
        .map((item) => ({
          key: item.Key,
          src: `${baseUrl.replace(/\/$/, '')}/${item.Key}`,
          alt: inferCaption(item.Key),
          caption: inferCaption(item.Key),
          uploadedAt: item.LastModified ?? null,
        }));

      return json(200, { photos }, responseOrigin);
    } catch (error) {
      console.error('list family photos failed', error);
      return json(502, { error: 'Failed to load family photos.' }, responseOrigin);
    }
  }

  if (method === 'POST') {
    const body = parseBody(event);
    if (body === null) {
      return json(400, { error: 'Invalid JSON body.' }, responseOrigin);
    }

    const originalName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';

    if (!originalName || !contentType.startsWith('image/')) {
      return json(400, { error: 'fileName and an image contentType are required.' }, responseOrigin);
    }

    const safeName = sanitizeFileName(originalName) || `photo-${Date.now()}.jpg`;
    const key = `${PREFIX}${Date.now()}-${safeName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

      return json(
        200,
        {
          uploadUrl,
          key,
          publicUrl: `${baseUrl.replace(/\/$/, '')}/${key}`,
        },
        responseOrigin
      );
    } catch (error) {
      console.error('create upload url failed', error);
      return json(502, { error: 'Failed to create upload URL.' }, responseOrigin);
    }
  }

  return json(405, { error: 'Method not allowed.' }, responseOrigin);
}
