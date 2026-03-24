import { Module } from '@nestjs/common';
import { ServiceCatalogService } from './service-catalog.service';

@Module({
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
