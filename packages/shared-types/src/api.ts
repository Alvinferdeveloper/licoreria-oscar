export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
