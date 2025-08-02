import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string | undefined;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string | undefined;
}

export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    path: res.req.path,
  };

  res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: any
): void {
  const response: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: res.req.path,
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.data = error;
  }

  res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): void {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const response: PaginatedResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    path: res.req.path,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };

  res.status(200).json(response);
}

export function createdResponse<T>(
  res: Response,
  data: T,
  message?: string
): void {
  successResponse(res, data, message, 201);
}

export function noContentResponse(res: Response): void {
  res.status(204).send();
} 