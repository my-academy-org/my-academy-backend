// Lets browsers PUT lesson videos straight to the Backblaze bucket.
// Run once (and again when the origins change): node scripts/setup-b2-cors.mjs
import 'dotenv/config';
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const region = process.env.B2_REGION ?? 'eu-central-003';
const client = new S3Client({
  region,
  endpoint: process.env.B2_ENDPOINT ?? `https://s3.${region}.backblazeb2.com`,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

// Same origins the API itself accepts (see src/main.ts).
const origins = [
  'https://my-academy.online',
  'https://*.my-academy.online',
  ...(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

await client.send(
  new PutBucketCorsCommand({
    Bucket: process.env.B2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          ID: 'lesson-video-upload',
          AllowedOrigins: origins,
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
console.log(`CORS set on ${process.env.B2_BUCKET} for:`, origins);
