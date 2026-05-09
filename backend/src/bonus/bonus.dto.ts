import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class AdminAddBonusDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  daysValid?: number = 30;
}

export class AdminSubtractBonusDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;
}
