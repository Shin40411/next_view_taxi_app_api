import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EncryptionUtil } from 'src/utils/transformers/crypto.util';

@Injectable()
export class EncryptInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const isEncryptionEnabled = process.env.ENABLE_ENCRYPTION === 'true';

        return next.handle().pipe(
            map((data) => {
                if (!isEncryptionEnabled) return data;

                const encrypted = EncryptionUtil.encrypt(data);
                return {
                    data: encrypted,
                };
            }),
        );
    }
}