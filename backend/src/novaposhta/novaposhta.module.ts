import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NovaPoshtaService } from './novaposhta.service';
import { NovaPoshtaController } from './novaposhta.controller';

@Module({
  imports: [HttpModule],
  controllers: [NovaPoshtaController],
  providers: [NovaPoshtaService],
})
export class NovaPoshtaModule {}
