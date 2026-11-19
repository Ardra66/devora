
require("dotenv").config();

const tigris = require("./config/tigris");

const {
  PutObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

async function testTigris() {
  const bucket = process.env.TIGRIS_BUCKET;
  const testFileKey = "test/devora-test.txt";

  try {
    // 1. Check bucket connection
    await tigris.send(
      new HeadBucketCommand({
        Bucket: bucket,
      })
    );

    console.log("Tigris connection successful!");

    // 2. Upload a temporary test file
    await tigris.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testFileKey,
        Body: "Devora AI Tigris storage test!",
        ContentType: "text/plain",
      })
    );

    console.log("Test file uploaded successfully!");

    // 3. Delete the temporary test file
    await tigris.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: testFileKey,
      })
    );

    console.log("Temporary test file deleted successfully!");
    console.log("Tigris storage test completed!");
  } catch (error) {
    console.error("Tigris test failed!");
    console.error("Error:", error.message);
    console.error("HTTP status:", error.$metadata?.httpStatusCode);
  }
}

testTigris();