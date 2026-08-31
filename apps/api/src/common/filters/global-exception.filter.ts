import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Formato de error único de la API; los 500 nunca exponen detalles internos
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // getResponse() puede ser string u objeto { message, error }
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
      res.status(status).json({
        statusCode: status,
        message,
        error: exception.name.replace('Exception', ''),
      });
      return;
    }

    this.logger.error(
      'Error no controlado',
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: 'InternalServerError',
    });
  }
}
