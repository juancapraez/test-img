module.exports = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  RECEIPT_API_KEY: process.env.RECEIPT_API_KEY,
  PORT: process.env.PORT,
  BASE_URL: process.env.BASE_URL,

  // API Endpoints
  BANK_ENTITIES: '/miscellaneous/entities/cash',
  USER_INFO: '/miscellaneous/user-info',
  BARCODE_URL: '/miscellaneous/create-barcode'
};
