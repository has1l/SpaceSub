import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';

export enum BillingCycleDto {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'Netflix' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Streaming service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 799 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'RUB', default: 'RUB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingCycleDto, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(BillingCycleDto)
  billingCycle?: BillingCycleDto;

  @ApiProperty({ example: '2026-03-15T00:00:00.000Z' })
  @IsDateString()
  nextBilling: string;

  @ApiPropertyOptional({ example: 'Entertainment' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
