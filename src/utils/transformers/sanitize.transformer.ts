import { Transform } from 'class-transformer';

export interface SanitizeOptions {
    trim?: boolean;
}

export function Sanitize(options: SanitizeOptions = { trim: true }) {
    return Transform(({ value }) => {
        if (typeof value !== 'string') {
            return value;
        }
        let sanitized = value.replace(/<[^>]*>?/gm, '');
        if (options.trim) {
            sanitized = sanitized.trim();
        }

        return sanitized;
    });
}
