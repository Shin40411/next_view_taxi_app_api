import CryptoJS from 'crypto-js';

const getSecretKey = () => process.env.PAYLOAD_ENCRYPTION_KEY || 'default-secret-key';

export const EncryptionUtil = {
    encrypt: (data: any) => {
        try {
            if (!data) return null;
            const key = getSecretKey();
            // console.log('[EncryptionUtil]  key:', key); 
            return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        } catch (e) {
            console.error('Encryption Error:', e);
            return null;
        }
    },

    decrypt: (ciphertext: string) => {
        try {
            if (!ciphertext) return null;
            const key = getSecretKey();
            // console.log('[EncryptionUtil] Using key (len):', key.length); // Debug string length

            const bytes = CryptoJS.AES.decrypt(ciphertext, key);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);

            if (!originalText) {
                console.error('[EncryptionUtil] Decrypt returned empty string. Possible wrong key.');
                return null;
            }

            return JSON.parse(originalText);
        } catch (e) {
            console.error('Decryption Error:', e);
            return null;
        }
    }
};