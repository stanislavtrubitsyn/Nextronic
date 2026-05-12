import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface UpRegion {
  id: string;
  name: string;
}

export interface UpDistrict {
  id: string;
  name: string;
}

export interface UpCity {
  id: string;
  name: string;
  type: string;
}

export interface UpPostOffice {
  id: string;
  postcode: string;
  name: string;
  address: string;
}

@Injectable()
export class UkrposhtaService {
  private readonly logger = new Logger(UkrposhtaService.name);
  private readonly apiUrl = 'https://ukrposhta.ua/address-classifier-ws';

  constructor(private readonly httpService: HttpService) {}

  private async makeGetRequest(endpoint: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.apiUrl}${endpoint}`));

      // Укрпошта повертає дані у форматі { Entries: { Entry: [...] } }
      const entries = response.data?.Entries?.Entry;

      if (!entries) return [];
      // Якщо повертається один об'єкт (а не масив), загортаємо його в масив
      return Array.isArray(entries) ? entries : [entries];
    } catch (error) {
      this.logger.error(`Ukrposhta API Error on ${endpoint}:`, error);
      throw new HttpException("Помилка зв'язку з Укрпоштою", HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  //Отримання всіх областей
  async getRegions(): Promise<UpRegion[]> {
    const data = await this.makeGetRequest('/get_regions_by_region_ua');
    return data.map(
      (item: any): UpRegion => ({
        id: String(item.REGION_ID),
        name: String(item.REGION_UA),
      }),
    );
  }

  //Отримання районів по ID області
  async getDistricts(regionId: string): Promise<UpDistrict[]> {
    const data = await this.makeGetRequest(
      `/get_districts_by_region_id_and_district_ua?region_id=${regionId}`,
    );
    return data.map(
      (item: any): UpDistrict => ({
        id: String(item.DISTRICT_ID),
        name: String(item.DISTRICT_UA),
      }),
    );
  }

  //Отримання міст по ID району
  async getCities(districtId: string): Promise<UpCity[]> {
    const data = await this.makeGetRequest(
      `/get_city_by_region_id_and_district_id_and_city_ua?district_id=${districtId}`,
    );
    return data.map(
      (item: any): UpCity => ({
        id: String(item.CITY_ID),
        name: String(item.CITY_UA),
        type: String(item.SHORTCITYTYPE_UA || item.CITYTYPE_UA || ''),
      }),
    );
  }

  //Отримання відділень по ID міста
  async getPostOffices(cityId: string): Promise<UpPostOffice[]> {
    const data = await this.makeGetRequest(
      `/get_postoffices_by_postcode_cityid_cityvpzid?city_id=${cityId}`,
    );

    return (
      data
        // Фільтруємо тимчасово закриті відділення (LOCK_CODE = 0 це активні)
        .filter((item: any) => item.LOCK_CODE === '0' || item.LOCK_CODE === 0)
        .map(
          (item: any): UpPostOffice => ({
            id: String(item.POSTOFFICE_ID),
            postcode: String(item.POSTCODE),
            name: String(item.POSTOFFICE_UA),
            address:
              String(item.STREET_UA_VPZ || '') + (item.HOUSENUMBER ? `, ${item.HOUSENUMBER}` : ''),
          }),
        )
    );
  }
}
