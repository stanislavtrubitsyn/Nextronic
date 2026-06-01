import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { ReplaceCategoryAttributesDto } from './attributes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { STAFF_ROLES } from '../auth/role-groups';
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get('category/:categoryId/form-schema')
  async getCategoryFormSchema(@Param('categoryId') categoryId: string) {
    return await this.attributesService.getCategoryFormSchema(categoryId);
  }

  @Post('category/:categoryId/schema')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  async replaceCategorySchema(
    @Param('categoryId') categoryId: string,
    @Body() body: Omit<ReplaceCategoryAttributesDto, 'categoryId'>,
  ) {
    return await this.attributesService.replaceCategoryAttributes(categoryId, body.attributes);
  }

  @Get('filterable-codes')
  async getFilterableCodes(
    @Query('categoryId') categoryId?: string,
    @Query('category') category?: string,
  ) {
    const codes = await this.attributesService.getFilterableCodes(categoryId, category);
    return { codes: Array.from(codes) };
  }
}
