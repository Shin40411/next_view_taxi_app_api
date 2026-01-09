import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private settings: any) {
        super({
            clientID: settings?.google_client_id || 'TEMP_CLIENT_ID',
            clientSecret: settings?.google_client_secret || 'TEMP_CLIENT_SECRET',
            callbackURL: settings?.google_callback_url || 'https://goxu.vn/api/v1/auth/google/callback',
            passReqToCallback: true,
            scope: ['email', 'profile', 'https://www.googleapis.com/auth/user.phonenumbers.read'],
        });
    }

    async validate(request: any, accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const { id, name, emails, photos, phoneNumbers } = profile;
        // console.log('Google Profile:', JSON.stringify(profile));

        const role = request.query.state || 'PARTNER';

        const user = {
            id,
            email: emails[0].value,
            phone: phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers[0].value : null,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos[0].value,
            role,
            accessToken,
        };
        done(null, user);
    }
}