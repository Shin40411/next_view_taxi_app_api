import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EncryptionUtil } from 'src/utils/transformers/crypto.util';

@Injectable()
export class DecryptMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const isEncryptionEnabled = process.env.ENABLE_ENCRYPTION === 'true';

        if (
            isEncryptionEnabled &&
            ['POST', 'PUT', 'PATCH'].includes(req.method) &&
            req.body &&
            req.body.data &&
            Object.keys(req.body).length === 1
        ) {
            console.log('[DecryptMiddleware] Encrypted payload found. Decrypting...');
            const decryptedData = EncryptionUtil.decrypt(req.body.data);

            if (!decryptedData) {
                console.error('[DecryptMiddleware] Decryption failed! Payload:', req.body.data);
                throw new BadRequestException('Invalid Encrypted Data');
            }

            console.log('[DecryptMiddleware] Decryption successful.');
            req.body = decryptedData;
        } else {
            // console.log('[DecryptMiddleware] Skipping decryption. Conditions not met.');
        }

        next();
    }
}