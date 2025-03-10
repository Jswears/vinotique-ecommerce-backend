import {
  ErrorResponse,
  ResponseHeaders,
  SuccessResponse,
} from "../types/utils";
import { formatDate } from "./formatDate";

// "https://vinotique.joaquinswears.com" ||

const DEFAULT_CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
export const log = (
  message: string,
  level: "INFO" | "ERROR" | "DEBUG" = "INFO"
) => {
  const timestamp = new Date().toISOString();
  console.log(`${formatDate(timestamp)} [${level}] ${message}`);
};

export const getCorsHeaders = (
  origin: string = DEFAULT_CORS_ORIGIN
): ResponseHeaders => {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
};

export const createErrorResponse = (
  statusCode: number,
  message: string,
  headers: ResponseHeaders = getCorsHeaders()
): ErrorResponse => {
  return {
    statusCode,
    body: JSON.stringify({ message }),
    headers,
  };
};

export const createNotFoundResponse = (
  message = "Not Found",
  headers: ResponseHeaders = getCorsHeaders()
): ErrorResponse => {
  return createErrorResponse(404, message, headers);
};

export const createBadRequestResponse = (
  message = "Bad Request",
  headers: ResponseHeaders = getCorsHeaders()
): ErrorResponse => {
  return createErrorResponse(400, message, headers);
};

export const createServerErrorResponse = (
  message = "Internal Server Error",
  headers: ResponseHeaders = getCorsHeaders()
): ErrorResponse => {
  return createErrorResponse(500, message, headers);
};

export const createSuccessResponse = <T>(
  statusCode: number,
  body: T,
  headers: ResponseHeaders = getCorsHeaders()
): SuccessResponse => {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers,
  };
};
