import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: '2026-02-15T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: -799 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 'RUB', default: 'RUB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'NETFLIX.COM' })
  @IsString()
  description: string;
}
