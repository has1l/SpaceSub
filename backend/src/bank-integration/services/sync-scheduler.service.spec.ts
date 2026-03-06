import { Test, TestingModule } from '@nestjs/testing';
import { SyncSchedulerService } from './sync-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BankIntegrationService } from '../bank-integration.service';
import { SubscriptionAnalyzerService } from './subscription-analyzer.service';

describe('SyncSchedulerService', () => {
  let service: SyncSchedulerService;
  let prisma: any;
  let bankIntegration: any;
  let analyzer: any;

  beforeEach(async () => {
    prisma = {
      bankConnection: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    bankIntegration = {
      syncFlex: jest.fn().mockResolvedValue({ ok: true, imported: 5, accounts: 1 }),
    };

    analyzer = {
      analyzeForUser: jest.fn().mockResolvedValue(2),
      markInactiveSubscriptions: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: BankIntegrationService, useValue: bankIntegration },
        { provide: SubscriptionAnalyzerService, useValue: analyzer },
      ],
    }).compile();

    service = module.get(SyncSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip when no active connections', async () => {
    prisma.bankConnection.findMany.mockResolvedValue([]);

    await service.handleSyncCron();

    expect(bankIntegration.syncFlex).not.toHaveBeenCalled();
    expect(analyzer.analyzeForUser).not.toHaveBeenCalled();
  });

  it('should sync all active connections and run analyzer', async () => {
    prisma.bankConnection.findMany.mockResolvedValue([
      { id: 'c1', userId: 'u1', provider: 'FLEX', lastSyncAt: null },
      { id: 'c2', userId: 'u2', provider: 'FLEX', lastSyncAt: null },
    ]);

    await service.handleSyncCron();

    expect(bankIntegration.syncFlex).toHaveBeenCalledTimes(2);
    expect(bankIntegration.syncFlex).toHaveBeenCalledWith('u1');
    expect(bankIntegration.syncFlex).toHaveBeenCalledWith('u2');

    // Analyzer should run for both users
    expect(analyzer.analyzeForUser).toHaveBeenCalledTimes(2);
    expect(analyzer.markInactiveSubscriptions).toHaveBeenCalledTimes(2);
  });

  it('should continue syncing other users if one fails', async () => {
    prisma.bankConnection.findMany.mockResolvedValue([
      { id: 'c1', userId: 'u1', provider: 'FLEX', lastSyncAt: null },
      { id: 'c2', userId: 'u2', provider: 'FLEX', lastSyncAt: null },
    ]);

    bankIntegration.syncFlex
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, imported: 3, accounts: 1 });

    await service.handleSyncCron();

    expect(bankIntegration.syncFlex).toHaveBeenCalledTimes(2);
    // Only u2 succeeded, so analyzer should only run for u2
    expect(analyzer.analyzeForUser).toHaveBeenCalledTimes(1);
    expect(analyzer.analyzeForUser).toHaveBeenCalledWith('u2');
  });

  it('should prevent concurrent runs (concurrency guard)', async () => {
    prisma.bankConnection.findMany.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([
        { id: 'c1', userId: 'u1', provider: 'FLEX', lastSyncAt: null },
      ]), 50)),
    );

    // Start two concurrent runs
    const run1 = service.handleSyncCron();
    const run2 = service.handleSyncCron(); // should skip due to running flag

    await Promise.all([run1, run2]);

    // Only one run should have queried connections
    expect(prisma.bankConnection.findMany).toHaveBeenCalledTimes(1);
  });

  it('should release lock after error', async () => {
    prisma.bankConnection.findMany.mockRejectedValueOnce(
      new Error('DB down'),
    );

    await service.handleSyncCron(); // should not throw

    // Lock should be released — next run should proceed
    prisma.bankConnection.findMany.mockResolvedValue([]);
    await service.handleSyncCron();

    expect(prisma.bankConnection.findMany).toHaveBeenCalledTimes(2);
  });

  it('should not run analyzer if sync fails for user', async () => {
    prisma.bankConnection.findMany.mockResolvedValue([
      { id: 'c1', userId: 'u1', provider: 'FLEX', lastSyncAt: null },
    ]);

    bankIntegration.syncFlex.mockRejectedValue(new Error('auth error'));

    await service.handleSyncCron();

    expect(analyzer.analyzeForUser).not.toHaveBeenCalled();
  });
});
