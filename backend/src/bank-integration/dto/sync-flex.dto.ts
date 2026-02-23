import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class SyncFlexDto {
  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Sync transactions from this date',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-02-23T00:00:00.000Z',
    description: 'Sync transactions up to this date',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
