import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConnectionCodeController } from './connection-code.controller';
import { ConnectionCodeService } from './connection-code.service';
import { TokenEncryptionService } from './token-encryption.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [ConnectionCodeController],
  providers: [ConnectionCodeService, TokenEncryptionService],
  exports: [ConnectionCodeService, TokenEncryptionService],
})
export class ConnectionCodeModule {}
