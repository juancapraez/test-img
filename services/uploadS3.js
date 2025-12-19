/**
 * Sube un archivo a S3 y retorna la URL pública
 */

const AWS = require("aws-sdk");
const {
  AWS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  REGION,
} = require("../config/index.js");

const s3 = new AWS.S3({
  accessKeyId: AWS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: REGION || "us-east-1",
});

async function uploadFileToS3({ path, filename, type, buffer }) {
  const bucketName = process.env.S3_BUCKET_TRAZO;
  const key = `${path}/${filename}`;
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: type,
    ACL: "public-read",
  };
  await s3.upload(params).promise();
  const url = `https://${bucketName}/${key}`;
  return { url, key };
}

module.exports = {
  s3,
  uploadFileToS3,
};