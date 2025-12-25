import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    statusCode: number;
    message: string;
    data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        return next.handle().pipe(
            map(data => {
                if (data && data.statusCode && data.message && data.data) {
                    return data;
                }

                const request = context.switchToHttp().getRequest();
                const method = request.method;
                let message = 'Success';

                if (typeof data === 'object' && data !== null && 'message' in data) {
                    message = data.message;
                }

                return {
                    statusCode: context.switchToHttp().getResponse().statusCode,
                    message: (data && data.message) ? data.message : 'Success',
                    data: data
                };
            }),
        );
    }
}
