import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';

@Module({
  controllers: [IntegrationController],
})
export class IntegrationModule {}
