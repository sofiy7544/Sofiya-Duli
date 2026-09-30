export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, 'bad_request', message, details);
export const unauthorized = () => new AppError(401, 'unauthorized', 'Требуется вход');
export const forbidden = () => new AppError(403, 'forbidden', 'Недостаточно прав');
export const notFound = (what = 'Объект') => new AppError(404, 'not_found', `${what} не найден`);
export const conflict = (message: string) => new AppError(409, 'conflict', message);
export const tooMany = (message: string) => new AppError(429, 'too_many_requests', message);
