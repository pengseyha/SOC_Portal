import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';
import { logEvent } from '../services/loggingService.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception instanceof ZodError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof ZodError
      ? exception.issues.map((issue) => issue.message).join(', ')
      : exception instanceof HttpException
        ? this.messageFromHttpException(exception)
        : 'Server error';

    await logEvent({
      req: request,
      userId: request.user?.id,
      username: request.user?.username || 'anonymous',
      eventType: status === 404 ? 'invalid_api_request' : 'application_error',
      severity: status === 404 ? 'low' : 'high',
      status: 'failed',
      description: exception instanceof Error ? exception.message : message,
      security: true
    });

    response.status(status).json({ message });
  }

  private messageFromHttpException(exception: HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : message;
    }
    return exception.message;
  }
}
