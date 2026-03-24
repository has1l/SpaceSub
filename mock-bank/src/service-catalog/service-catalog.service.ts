import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceCatalogService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, category?: string) {
    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.serviceCatalog.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }
}
