import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OWNER_ADMIN_ROLES } from '../auth/role-groups';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(...OWNER_ADMIN_ROLES)
  async getDashboard(
    @Query('period') period?: '24h' | 'week' | 'month' | 'year' | 'all' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const validPeriod = period || 'month';
    return await this.analyticsService.getDashboardStats(validPeriod, startDate, endDate);
  }
}
