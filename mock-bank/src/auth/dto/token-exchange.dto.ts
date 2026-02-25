import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenExchangeDto {
  @ApiProperty({ description: 'Yandex OAuth access token' })
  @IsString()
  @IsNotEmpty()
  yandexAccessToken: string;
}
