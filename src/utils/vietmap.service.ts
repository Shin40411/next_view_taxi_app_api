import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class VietmapService {
    private apiKey: string;

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('VIETMAP_API_KEY') || '';
    }

    async autocomplete(keyword: string) {
        try {
            const url = `https://maps.vietmap.vn/api/autocomplete/v3?apikey=${this.apiKey}&text=${encodeURI(keyword)}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Vietmap Autocomplete Error:', error);
            return [];
        }
    }

    async getRoute(lat1: number, long1: number, lat2: number, long2: number) {
        try {
            const url = `https://maps.vietmap.vn/api/route?api-version=1.1&apikey=${this.apiKey}&point=${lat1},${long1}&point=${lat2},${long2}&vehicle=car`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async reverseGeocode(lat: number, long: number) {
        try {
            const url = `https://maps.vietmap.vn/api/reverse/v3?apikey=${this.apiKey}&lat=${lat}&lng=${long}`;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            return null;
        }
    }
}