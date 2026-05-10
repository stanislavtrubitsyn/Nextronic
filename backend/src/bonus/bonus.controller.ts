import { Controller, Get, Post, Req, UseGuards, Body } from '@nestjs/common';
import { BonusService } from './bonus.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/users.entity';
import { AdminAddBonusDto, AdminSubtractBonusDto } from './bonus.dto';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    role: UserRole;
  };
}

@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Get('balance')
  async getMyBalance(@Req() req: RequestWithUser) {
    return await this.bonusService.getBalance(req.user.userId);
  }

  @Get('history')
  async getMyHistory(@Req() req: RequestWithUser) {
    return await this.bonusService.getHistory(req.user.userId);
  }

  @Post('add')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAdd(@Body() dto: AdminAddBonusDto) {
    return await this.bonusService.adminAddBonus(dto);
  }

  @Post('subtract')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminSubtract(@Body() dto: AdminSubtractBonusDto) {
    return await this.bonusService.adminSubtractBonus(dto);
  }
}
