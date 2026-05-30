import { IsString } from 'class-validator';

export class LiqPayCallbackDto {
  @IsString()
  data!: string;

  @IsString()
  signature!: string;
}
