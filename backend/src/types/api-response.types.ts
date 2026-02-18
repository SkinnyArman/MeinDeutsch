export interface ApiErrorBody {
  code: string;
  details?: unknown;
}

export interface ApiMeta {
  requestId?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
  meta: ApiMeta;
}
