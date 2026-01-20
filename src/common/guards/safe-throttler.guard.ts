import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class SafeThrottlerGuard extends ThrottlerGuard {
    protected errorMessage = 'Bạn đã truy cập quá nhiều lần, vui lòng thử lại sau 1 phút';

    protected async handleRequest(requestProps: any): Promise<boolean> {
        const { context } = requestProps;

        return super.handleRequest(requestProps);
    }
}
