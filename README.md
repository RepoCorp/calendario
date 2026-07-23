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

After you edit the code, redeploy with these steps:

1. Build the app again

```bash
npm run build
```

2. Upload the new build to S3

```bash
aws s3 sync dist/ s3://mifamilita.com --delete
```

3. Invalidate CloudFront cache so visitors get the latest files

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths \"/*\"
```

4. Confirm deployment

- Open `https://mifamilita.com` and test at least one day URL (for example `/nieve-8k2f`).
