export function generateTripCode(servicePointName: string): string {
    const normalizeName = (str: string) => {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .toUpperCase();
    };

    const words = normalizeName(servicePointName).split(' ').filter(w => w.length > 0);
    const lastName = words.length > 0 ? words[words.length - 1] : 'TRIP';

    const now = new Date();
    const date = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}`; // DDMM

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 4; i++) {
        random += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return `${lastName}${date}${random}`;
}
