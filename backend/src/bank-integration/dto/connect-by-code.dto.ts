import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ConnectByCodeDto {
  @ApiProperty({
    example: 'FB-7K2M9Q',
    description: 'One-time connection code from Flex Bank (format: FB-XXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^FB-[A-Z0-9]{6}$/, {
    message: 'Code must be in format FB-XXXXXX (6 alphanumeric characters)',
  })
  code: string;
}
