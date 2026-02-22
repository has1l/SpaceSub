import { Module } from '@nestjs/common';
import { ForecastController } from './forecast.controller';

@Module({
  controllers: [ForecastController],
})
export class ForecastModule {}
