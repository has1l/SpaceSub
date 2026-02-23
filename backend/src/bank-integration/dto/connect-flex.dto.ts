import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ConnectFlexDto {
  @ApiProperty({ example: 'eyJhbGciOi...' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ example: 'eyJhbGciOi...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ example: '2026-03-23T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
