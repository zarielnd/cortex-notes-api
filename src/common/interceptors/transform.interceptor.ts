import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const statusCode = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>().statusCode;
    return next.handle().pipe(
      map((data: T) => ({
        data,
        timestamp: new Date().toISOString(),
        statusCode,
      })),
    );
  }
}
