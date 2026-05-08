import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BonusService } from './bonus.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Get('balance')
  async getMyBalance(@Req() req: RequestWithUser) {
    return await this.bonusService.getBalance(req.user.userId);
  }
}
