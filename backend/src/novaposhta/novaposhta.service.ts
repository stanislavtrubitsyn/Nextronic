import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// Описуємо структуру для Міста
export interface NpCity {
  ref: string;
  name: string;
  area: string;
}

// Описуємо структуру для Відділення
export interface NpWarehouse {
  ref: string;
  name: string;
  shortName: string;
  number: string;
}

@Injectable()
export class NovaPoshtaService {
  private readonly logger = new Logger(NovaPoshtaService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.novaposhta.ua/v2.0/json/';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('NOVA_POSHTA_API_KEY') || '';
  }

  private async makeRequest(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, any> = {},
  ): Promise<any> {
    if (!this.apiKey) {
      throw new HttpException(
        'API ключ Нової Пошти не налаштовано',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, {
          apiKey: this.apiKey,
          modelName,
          calledMethod,
          methodProperties,
        }),
      );

      if (!response.data.success) {
        this.logger.error(`NP API Error: ${JSON.stringify(response.data.errors)}`);
        throw new HttpException('Помилка API Нової Пошти', HttpStatus.BAD_REQUEST);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException("Помилка зв'язку з Новою Поштою", HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async searchCities(searchString: string): Promise<NpCity[]> {
    const data: any[] = await this.makeRequest('Address', 'getCities', {
      FindByString: searchString,
      Limit: 20,
    });

    return data.map(
      (city: any): NpCity => ({
        ref: String(city.Ref),
        name: String(city.Description),
        area: String(city.AreaDescription),
      }),
    );
  }

  async getWarehouses(cityRef: string): Promise<NpWarehouse[]> {
    const data: any[] = await this.makeRequest('Address', 'getWarehouses', {
      CityRef: cityRef,
    });

    return data.map(
      (wh: any): NpWarehouse => ({
        ref: String(wh.Ref),
        name: String(wh.Description),
        shortName: String(wh.ShortAddress),
        number: String(wh.Number),
      }),
    );
  }
}
