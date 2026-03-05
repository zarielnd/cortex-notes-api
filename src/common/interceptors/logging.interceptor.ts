import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            message: 'Request completed',
            correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            userId: req.user,
          });
        },
        error: (err: Error) => {
          this.logger.error({
            message: 'Request failed',
            correlationId,
            method: req.method,
            path: req.path,
            durationMs: Date.now() - start,
            error: err.message,
          });
        },
      }),
    );
  }
}
