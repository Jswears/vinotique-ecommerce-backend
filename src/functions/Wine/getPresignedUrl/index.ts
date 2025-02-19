import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Handler } from "aws-lambda";
import Logger from "../../../utils/logger";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../utils/returnResponse";

// ---- Constants ----
const BUCKET_NAME = process.env.BUCKET_NAME || "wine-ecommerce";
const logger = new Logger("presignedUrl");
const s3Client = new S3Client({});

// ---- Validate environment variables ----
if (!BUCKET_NAME) {
  throw new Error("BUCKET_NAME environment variable is not set");
}
// ---- Helper functions ----
const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    ContentType: fileType,
  });
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
  logger.info("Presigned URL generated", signedUrl);
  return signedUrl;
};

// ---- Main handler ----
export const handler: Handler = async (event) => {
  try {
    logger.info("Getting presigned URL");

    const body = JSON.parse(event.body || "{}");
    if (!body) {
      logger.error("Missing body");
      return createErrorResponse(400, "Missing body");
    }

    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      logger.error("Missing fileName or fileType");
      return createErrorResponse(400, "Missing fileName or fileType");
    }

    const presignedUrl = await generatePresignedUrl(fileName, fileType);
    return createSuccessResponse(200, { presignedUrl });
  } catch (error) {
    logger.error("Error getting presigned URL", error);
    return createErrorResponse(500, "Error getting presigned URL");
  }
};
