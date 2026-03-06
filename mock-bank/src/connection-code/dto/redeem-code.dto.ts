import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemCodeDto {
  @ApiProperty({ description: 'SHA-256 hash of the connection code' })
  @IsString()
  @IsNotEmpty()
  codeHash: string;
}
