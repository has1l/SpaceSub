import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ example: 'Основной счёт' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'RUB', default: 'RUB' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;
}
