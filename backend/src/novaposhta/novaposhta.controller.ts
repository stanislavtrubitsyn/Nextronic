import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { NovaPoshtaService, NpCity, NpWarehouse } from './novaposhta.service';

@Controller('delivery')
export class NovaPoshtaController {
  constructor(private readonly npService: NovaPoshtaService) {}

  @Get('cities')
  async searchCities(@Query('q') q: string): Promise<NpCity[]> {
    if (!q || q.length < 2) {
      return [];
    }
    return await this.npService.searchCities(q);
  }

  @Get('warehouses')
  async getWarehouses(@Query('cityRef') cityRef: string): Promise<NpWarehouse[]> {
    if (!cityRef) {
      throw new BadRequestException('Необхідно передати cityRef');
    }
    return await this.npService.getWarehouses(cityRef);
  }
}
