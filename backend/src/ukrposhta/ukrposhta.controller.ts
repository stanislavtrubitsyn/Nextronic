import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { UkrposhtaService, UpRegion, UpDistrict, UpCity, UpPostOffice } from './ukrposhta.service';

@Controller('delivery/ukrposhta')
export class UkrposhtaController {
  constructor(private readonly upService: UkrposhtaService) {}

  @Get('regions')
  async getRegions(): Promise<UpRegion[]> {
    return await this.upService.getRegions();
  }

  @Get('districts')
  async getDistricts(@Query('regionId') regionId: string): Promise<UpDistrict[]> {
    if (!regionId) throw new BadRequestException('Необхідно передати regionId');
    return await this.upService.getDistricts(regionId);
  }

  @Get('cities')
  async getCities(@Query('districtId') districtId: string): Promise<UpCity[]> {
    if (!districtId) throw new BadRequestException('Необхідно передати districtId');
    return await this.upService.getCities(districtId);
  }

  @Get('warehouses')
  async getPostOffices(@Query('cityId') cityId: string): Promise<UpPostOffice[]> {
    if (!cityId) throw new BadRequestException('Необхідно передати cityId');
    return await this.upService.getPostOffices(cityId);
  }
}
