const { S3Client } = require("@aws-sdk/client-s3");

const tigris = new S3Client({
  endpoint: process.env.TIGRIS_ENDPOINT,
  region: process.env.TIGRIS_REGION,
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY,
  },
});

module.exports = tigris;