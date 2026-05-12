import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UkrposhtaService } from './ukrposhta.service';
import { UkrposhtaController } from './ukrposhta.controller';

@Module({
  imports: [HttpModule],
  controllers: [UkrposhtaController],
  providers: [UkrposhtaService],
})
export class UkrposhtaModule {}
