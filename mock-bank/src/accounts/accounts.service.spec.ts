import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: {
    account: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('create', () => {
    it('should create an account with defaults', async () => {
      const created = { id: '1', userId: 'u1', name: 'Test', currency: 'RUB', balance: 0 };
      prisma.account.create.mockResolvedValue(created);

      const result = await service.create('u1', { name: 'Test' });
      expect(result).toEqual(created);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { userId: 'u1', name: 'Test', currency: 'RUB', balance: 0 },
      });
    });
  });

  describe('findAllByUser', () => {
    it('should return user accounts', async () => {
      const accounts = [{ id: '1' }, { id: '2' }];
      prisma.account.findMany.mockResolvedValue(accounts);

      const result = await service.findAllByUser('u1');
      expect(result).toEqual(accounts);
    });
  });

  describe('findOneOwned', () => {
    it('should return account if owned by user', async () => {
      const account = { id: '1', userId: 'u1' };
      prisma.account.findUnique.mockResolvedValue(account);

      const result = await service.findOneOwned('1', 'u1');
      expect(result).toEqual(account);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      await expect(service.findOneOwned('1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owned', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: '1', userId: 'other' });
      await expect(service.findOneOwned('1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });
});
