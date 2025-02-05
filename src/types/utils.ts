// Response Types
export interface ResponseHeaders {
  [key: string]: string | boolean | number;
}

export interface ErrorResponse {
  statusCode: number;
  body: string;
  headers: ResponseHeaders;
}

export interface SuccessResponse {
  statusCode: number;
  body: string;
  headers: ResponseHeaders;
}
