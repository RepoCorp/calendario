# Mi Familita Advent Calendar

React + Vite app where each Advent day is opened from a private URL (`/:slug`) and stays locked until its date.

## Start

1. Install dependencies

```bash
npm install
```

2. Run locally

```bash
npm run dev
```

Open http://localhost:5184. The development server uses a fixed port and stops
with an error if it is occupied, instead of switching to another project's port.

## Project structure

- `src/calendarEntries.js`: map day, random slug, and unlock date.
- `src/days/Day01.jsx ... Day24.jsx`: independent page components.
- `src/dateGate.js`: unlock logic using `Europe/Berlin` timezone.

## Configure slugs and year

- Update the 24 values in `slugList` inside `src/calendarEntries.js`.
- Set `VITE_ADVENT_YEAR` in `.env` (copy from `.env.example`).

## Production URL format

Your hosting/router should direct URLs like this to the React app:

- `mifamilita.com/nieve-8k2f`
- `mifamilita.com/estrella-q9m1`
- etc.

## Deploy to S3

These steps deploy the built app to an S3 bucket as a static website.

1. Build the app

```bash
npm run build
```

2. Create bucket (replace with your domain/bucket name)

```bash
aws s3 mb s3://mifamilita.com --region eu-central-1
```

3. Enable static website hosting

```bash
aws s3 website s3://mifamilita.com --index-document index.html --error-document index.html
```

4. Allow public read (website endpoint requires public objects)

```bash
aws s3api put-public-access-block \
  --bucket mifamilita.com \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

```bash
aws s3api put-bucket-policy --bucket mifamilita.com --policy '{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"PublicReadGetObject",
      "Effect":"Allow",
      "Principal":"*",
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::mifamilita.com/*"]
    }
  ]
}'
```

5. Upload build output

```bash
aws s3 sync dist/ s3://mifamilita.com --delete
```

6. Open the website endpoint

```text
http://mifamilita.com.s3-website.eu-central-1.amazonaws.com
```

### SPA routing note (`/:slug`)

- This app uses client-side routing, so direct URLs like `/nieve-8k2f` must return `index.html`.
- In S3 website hosting, setting `--error-document index.html` handles this, but non-root routes may return `404` status with the app still loading.
- If you need proper `200` status for all routes, place CloudFront in front of S3 and add a custom error response (`403/404 -> /index.html`, response code `200`).

## Point `mifamilita.com` to the website (AWS)

Recommended production setup: `S3 + CloudFront + ACM + Route 53`.

1. Upload the React build to S3

```bash
npm run build
aws s3 sync dist/ s3://mifamilita.com --delete
```

2. Request SSL certificate in ACM (`us-east-1`)

- Request a public certificate for:
  - `mifamilita.com`
  - `www.mifamilita.com`
- Validate with DNS in Route 53.

3. Create CloudFront distribution

- Origin: S3 bucket (`mifamilita.com`) with Origin Access Control (OAC).
- Alternate domain names (CNAMEs):
  - `mifamilita.com`
  - `www.mifamilita.com`
- Attach the ACM certificate from `us-east-1`.
- Set default root object to `index.html`.
- Add custom error responses for SPA routing:
  - `403` -> `/index.html` with response code `200`
  - `404` -> `/index.html` with response code `200`

4. Create Route 53 records

- `A` Alias record for `mifamilita.com` -> CloudFront distribution
- `AAAA` Alias record for `mifamilita.com` -> CloudFront distribution
- `A` Alias record for `www` -> CloudFront distribution (optional if you redirect `www`)
- `AAAA` Alias record for `www` -> CloudFront distribution (optional if you redirect `www`)

5. Wait for propagation

- CloudFront deployment and DNS propagation usually finish in a few minutes, sometimes up to 30+ minutes.

## Redeploy after code changes

After you edit the code, deploy with:

```bash
npm run deploy
```

It builds the app, uploads hashed bundles before HTML, uploads public assets such as sounds, and
invalidates CloudFront. It intentionally never deletes old assets during deployment.

To use another bucket or distribution, prefix the command:

```bash
S3_BUCKET=another-bucket CLOUDFRONT_DISTRIBUTION_ID=ANOTHER_DISTRIBUTION npm run deploy
```

Confirm deployment:

- Open `https://mifamilita.com` and test at least one day URL (for example `/nieve-8k2f`).
- Never give an un-hashed file such as `assets/index.css` a long immutable cache lifetime. Hashed
  files are safe to cache for a year because every changed build receives a new filename.

## Email API

This repo includes a SAM-based email API for sending email through SES:

- Lambda source: `lambda/send-email/index.mjs`
- Request validation and email formatting: `lambda/send-email/handler.mjs`
- Family photo Lambda source: `lambda/family-photos/index.mjs`
- SAM template: `template.yaml`
- Example config: `samconfig.example.toml`

### What it expects

- `FROM_EMAIL`: verified SES sender identity
- `TO_EMAIL`: destination inbox
- `ALLOWED_ORIGIN`: frontend origin allowed to call the API, for example `https://mifamilita.com`

The endpoint accepts a `POST` JSON body like:

```json
{
  "senderName": "Cata",
  "replyTo": "someone@example.com",
  "subject": "Un mensaje desde la pagina",
  "message": "Hola desde Mi Familita"
}
```

Send `Content-Type: application/json`. `senderName`, `subject`, and `message`
are required, with limits of 100, 200, and 10,000 characters respectively.
`replyTo` is optional (up to 254 characters). The JSON body is limited to 64 KiB.
The server creates both plain text and escaped HTML, and always uses the configured
sender and destination. Older Day 12 builds can still send `text`; client-supplied
`html` is ignored.

Success returns `200 { "ok": true, "messageId": "..." }` after SES accepts the
message; this does not confirm arrival in the inbox. Errors return `{ "error": "..." }`:
400 for invalid input, 403 for a mismatched browser origin, 405 for an unsupported
method, 413 for an oversized body, 415 for a non-JSON request, 503 for missing sender
or destination configuration, and 502 if SES fails. Error responses preserve the
form's draft. An uncertain network failure can occur after SES accepts a message;
check the inbox before retrying. The SDK does not automatically retry sending.

The email route has a best-effort API Gateway throttle (1 request/second, burst 3).
Only the configured sender and recipient are permitted by its IAM policy. Origin
checks protect browser requests but are not authentication; this remains a public
endpoint and its throttle is not a per-person quota.

### Verify locally without sending email

```bash
npm run test:email
npm run build
```

The tests use Node's built-in test runner and an injected SES transport, so they
need neither AWS credentials nor an email endpoint and never send real email.
They cover request validation, CORS, UTF-8/base64 input, size limits, fixed delivery
addresses, safe HTML, compatibility, and provider errors.

For a local API backed by SES, install the Lambda dependencies and SAM CLI, put
the following in an untracked `email-env.local.json`, and use verified addresses:

```json
{
  "SendEmailFunction": {
    "FROM_EMAIL": "hello@mifamilita.com",
    "TO_EMAIL": "you@example.com",
    "ALLOWED_ORIGIN": "http://localhost:5184"
  }
}
```

```bash
sam build
sam local start-api --env-vars email-env.local.json --port 3001
```

Set `VITE_EMAIL_API_URL=http://localhost:3001/send-email` in `.env` and restart Vite.
SAM local also needs Docker and AWS credentials with SES send permission.
Submitting this form sends real email. Only run a delivery check when intended.
Do not put AWS credentials or the server's sender/recipient configuration in
`VITE_*` variables, which are bundled into the browser.

### Why SAM here

The SAM template defines:

- one Lambda function
- one family photo Lambda function
- one HTTP API Gateway
- the `/send-email` route
- the `/family-photos` routes
- CORS for your frontend
- SES send permission for the Lambda

### One-time AWS setup

1. Verify the sender in SES in the same region as the Lambda (the example uses `eu-central-1`).
2. If your SES account is still in sandbox, also verify the destination recipient or request production access.
3. Install the AWS SAM CLI if you do not already have it.
4. Make sure your S3 bucket can serve the family photos publicly, or via the same public URL your site uses for bucket objects.
5. Add S3 CORS for browser uploads if you want Day 14 uploads from the app.

### Install the AWS SAM CLI (macOS)

SAM CLI is a separate tool from the AWS CLI; installing `aws` does not install `sam`.

If you already use Homebrew, install and verify it with:

```bash
brew install aws-sam-cli
sam --version
```

For future updates, run `brew upgrade aws-sam-cli`. This is the community-maintained
Homebrew formula; AWS no longer maintains the old `aws/tap/aws-sam-cli` installer.
See [AWS's Homebrew instructions](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/manage-sam-cli-versions.html).

Alternatively, use AWS's macOS package installer:

1. Open the [official AWS SAM CLI installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and select macOS.
2. Download `aws-sam-cli-macos-arm64.pkg` for an Apple Silicon Mac, or
   `aws-sam-cli-macos-x86_64.pkg` for an Intel Mac. Check **Apple menu → About This Mac**
   if you are unsure which processor you have.
3. Open the downloaded package and follow the installer.
4. Open a new terminal and verify:

```bash
sam --version
aws --version
aws sts get-caller-identity
```

The last command checks which AWS account your existing credentials select; it
must be the account where you intend to deploy. SAM uses those AWS credentials.
If `aws` is missing, install it using the
[AWS CLI installation guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html),
then configure your AWS login/profile. Do not put credentials in frontend files.
Docker is needed for `sam local start-api` and container-based builds; ordinary
`sam build` for this project's Node functions uses the local Node/npm toolchain.

### Serve Day 14 photos through the website

The photo Lambda builds URLs as `FamilyBucketPublicBaseUrl` + `/family/filename`.
For this project, set these SAM parameters:

```text
FamilyBucketName=mifamilita.com
FamilyBucketPublicBaseUrl=https://mifamilita.com
```

First open the URL of an existing photo, for example
`https://mifamilita.com/family/photo1.jpg`, in a private browser window. Use an
actual filename from the bucket. If the image loads, the read-access setup is
already working. If you see the calendar instead, check CloudFront routing and
SPA rewrites for `/family/*`; the request must return the image object.

For a private S3 bucket behind CloudFront, use origin access control (OAC):

1. In **CloudFront → your distribution → Origins**, select the S3 bucket origin
   and edit its origin access to use OAC with request signing enabled.
2. Apply the provided read-access bucket-policy statement in
   **S3 → mifamilita.com → Permissions → Bucket policy**. Merge it with existing
   statements, preserving the site's current access. It must permit
   `cloudfront.amazonaws.com` to perform `s3:GetObject` on
   `arn:aws:s3:::mifamilita.com/family/*`, restricted to your distribution's ARN.
   An existing equivalent permission for `mifamilita.com/*` already covers photos.
3. Keep S3 Block Public Access enabled with this setup. Ensure CloudFront routes
   `/family/*` to that origin, then wait for deployment and retry the image URL.

OAC requires a regular S3 origin, not an S3 website endpoint. See the
[AWS OAC setup guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).
If your existing website already serves photos publicly, reuse that working setup;
you do not need to make the entire bucket public. Photos served through these
public website URLs are readable by anyone who has the URL.

### Configure S3 CORS for Day 14 browser uploads

Day 14 obtains a signed upload URL from the API, then uploads directly to S3
using `PUT`. Configure CORS on the photo bucket, even when downloads use CloudFront.
CORS does not grant public write access; the signed URL supplies upload authorization.

In **S3 → mifamilita.com → Permissions → Cross-origin resource sharing (CORS) → Edit**,
paste this array and save. Preserve any existing rules needed by other bucket users.

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://mifamilita.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

For local browser uploads, add `http://localhost:5184` to `AllowedOrigins`.
Add `https://www.mifamilita.com` only if you actually use that origin. Origins must
match the page's scheme, hostname, and port, without a path or trailing slash.
The API's `AllowedOrigin` must also match the frontend used for testing; S3 CORS
and API CORS are separate settings. See [S3 CORS configuration elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html).

Alternatively, save this **wrapped object** as `bucket-cors.json` for the AWS CLI
(the console takes an array, but the CLI requires `CORSRules`):

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedOrigins": ["https://mifamilita.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

Read the existing configuration before replacing it:

```bash
aws s3api get-bucket-cors --bucket mifamilita.com
aws s3api put-bucket-cors \
  --bucket mifamilita.com \
  --cors-configuration file://bucket-cors.json
aws s3api get-bucket-cors --bucket mifamilita.com
```

`NoSuchCORSConfiguration` on the initial read means no rules exist yet. The PUT
command replaces the whole CORS configuration, so include any existing rules you
need to retain. See the [AWS CLI CORS reference](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html).
When ready to create an actual object, upload a photo from Day 14 and confirm that
it appears in the album and its website URL opens directly.

### Deploy with SAM

1. Install the Lambda dependencies (SAM also installs them during its build):

```bash
npm install --prefix lambda/send-email
npm install --prefix lambda/family-photos
```

2. Copy the example SAM config if you want a reusable local deploy profile:

```bash
cp samconfig.example.toml samconfig.toml
```

3. Update the values in `samconfig.toml`, or pass them directly on the command line.

4. Build:

```bash
sam build
```

5. Deploy:

```bash
sam deploy \
  --stack-name mifamilita-email-api \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region eu-central-1 \
  --parameter-overrides \
    AllowedOrigin=https://mifamilita.com \
    FromEmail=hello@mifamilita.com \
    ToEmail=you@example.com \
    FamilyBucketName=mifamilita.com \
    FamilyBucketPublicBaseUrl=https://mifamilita.com
```

If you created `samconfig.toml`, then after the first deploy you can usually just run:

```bash
sam build
sam deploy
```

### What SAM creates

- Lambda function: `mifamilita-send-email`
- Lambda function: `mifamilita-family-photos`
- HTTP API Gateway route: `POST /send-email`
- HTTP API Gateway route: `GET /family-photos`
- HTTP API Gateway route: `POST /family-photos/upload-url`
- Lambda environment variables for `ALLOWED_ORIGIN`, `FROM_EMAIL`, and `TO_EMAIL`
- IAM permission allowing SES sending only from `FromEmail` to `ToEmail`
- IAM permission allowing S3 family photo list and upload actions

### Get the endpoint URL

After deploy:

```bash
aws cloudformation describe-stacks \
  --stack-name mifamilita-email-api \
  --query "Stacks[0].Outputs"
```

Copy the `SendEmailEndpoint` output value. That is the URL the frontend should call.

Also copy:

- `FamilyPhotosEndpoint`
- `FamilyPhotoUploadEndpoint`

### Connect the frontend

Add the API URL to your local `.env`:

```bash
VITE_ADVENT_YEAR=2026
VITE_EMAIL_API_URL=https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/send-email
VITE_FAMILY_API_BASE_URL=https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com
```

Then rebuild and redeploy the frontend:

```bash
npm run build
aws s3 sync dist/assets/ s3://mifamilita.com/assets/ \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp dist/index.html s3://mifamilita.com/index.html \
  --content-type "text/html" \
  --cache-control "no-cache, no-store, must-revalidate"

aws cloudfront create-invalidation --distribution-id E1GXOANMDMA1WD --paths "/*"
```

### Upload family photos with the CLI

Day 14 reads photos from the `family/` prefix in the S3 bucket. You can upload images there directly:

```bash
aws s3 cp /path/to/photo1.jpg s3://mifamilita.com/family/photo1.jpg
aws s3 cp /path/to/photo2.jpg s3://mifamilita.com/family/photo2.jpg
```

Or sync a whole local folder:

```bash
aws s3 sync /path/to/family-photos/ s3://mifamilita.com/family/
```

The Day 14 page will list the newest uploaded photos first.

### How Day 14 works

- It loads the album from `GET /family-photos`
- It uploads new images by requesting a presigned URL from `POST /family-photos/upload-url`
- It displays one large selected photo and the rest in a horizontal scrolling album rail
- Kids can upload more photos from the page using the `Agregar mas fotos` button

### Test the endpoint

This sends a real message to the configured `ToEmail` inbox:

```bash
curl -X POST "https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/send-email" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Prueba",
    "message": "Hola desde la API",
    "senderName": "Mi Familita"
  }'
```

Test the family photo list:

```bash
curl "https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/family-photos"
```

### End-to-end checklist for Day 12

1. Verify the sender email in SES.
2. If SES is still in sandbox, verify the destination recipient too.
3. Run `npm install --prefix lambda/send-email`.
4. Deploy the backend with `sam build` and `sam deploy`.
5. Copy the `SendEmailEndpoint` CloudFormation output.
6. Set `VITE_EMAIL_API_URL` in `.env`.
7. Rebuild and redeploy the frontend to S3.
8. Invalidate CloudFront.
9. When ready to send a real email, open Day 12 and send a test message.

The email Lambda uses Node.js 22. Configuration details follow the AWS references
for [SES sending](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-using-sdk-programmatically.html),
[SES IAM restrictions](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html),
[HTTP API route settings](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-httpapi.html),
and [Lambda Node.js runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html).

### End-to-end checklist for Day 14

1. Make sure the bucket contains or can receive files under `family/`.
2. Apply S3 CORS for browser uploads.
3. Deploy the SAM stack with `FamilyBucketName` and `FamilyBucketPublicBaseUrl`.
4. Set `VITE_FAMILY_API_BASE_URL` in `.env`.
5. Rebuild and redeploy the frontend to S3.
6. Invalidate CloudFront.
7. Upload a test image with the AWS CLI or from the Day 14 page.
8. Open Day 14 and confirm the album loads horizontally and the new image appears.
