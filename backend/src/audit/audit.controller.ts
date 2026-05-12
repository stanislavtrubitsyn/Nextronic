import { Controller, Get, Post, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Отримати історію змін конкретного запису
  @Get('history/:entityName/:entityId')
  async getHistory(
    @Param('entityName') entityName: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return await this.auditService.getEntityHistory(entityName, entityId);
  }

  // Зробити відкат до конкретної версії (по ID логу)
  @Post('revert/:logId')
  async revertChange(@Param('logId', ParseUUIDPipe) logId: string) {
    return await this.auditService.revertChange(logId);
  }
}
