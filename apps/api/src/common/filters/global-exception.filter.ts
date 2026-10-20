import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Traducción de errores conocidos de Prisma a respuestas HTTP claras
const PRISMA_ERRORS: Record<
  string,
  { status: number; message: string; error: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Ya existe un registro con esos datos',
    error: 'Conflict',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'El registro está en uso por otros registros',
    error: 'Conflict',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'El registro solicitado no existe',
    error: 'NotFound',
  },
};

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

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERRORS[exception.code];
      this.logger.warn(`Prisma ${exception.code}: ${exception.message}`);
      res.status(mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        message: mapped?.message ?? 'Error interno del servidor',
        error: mapped?.error ?? 'InternalServerError',
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
