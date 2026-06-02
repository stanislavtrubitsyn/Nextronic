import { Controller, Get, Post, Param, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OWNER_ADMIN_ROLES } from '../auth/role-groups';
import { UserRole } from '../users/users.entity';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...OWNER_ADMIN_ROLES)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('history/:entityName/:entityId')
  async getHistory(
    @Param('entityName') entityName: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return await this.auditService.getEntityHistory(entityName, entityId);
  }

  @Post('revert/:logId')
  async revertChange(@Param('logId', ParseUUIDPipe) logId: string, @Req() req: RequestWithUser) {
    return await this.auditService.revertChange(logId, req.user?.userId);
  }
}
