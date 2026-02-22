import { TransactionsAnalysisService } from './transactions-analysis.service';

describe('TransactionsAnalysisService', () => {
  let service: TransactionsAnalysisService;

  beforeEach(() => {
    service = new TransactionsAnalysisService(null as any);
  });

  describe('normalizeDescription', () => {
    it('should lowercase and strip special chars', () => {
      expect(service.normalizeDescription('NETFLIX.COM/payment')).toBe(
        'netflix com payment',
      );
    });

    it('should collapse whitespace', () => {
      expect(service.normalizeDescription('  Spotify   Premium  ')).toBe(
        'spotify premium',
      );
    });
  });

  describe('groupTransactions', () => {
    it('should group transactions by amount+currency+description', () => {
      const txs = [
        makeTx('1', 799, 'NETFLIX.COM', '2025-01-15'),
        makeTx('2', 799, 'NETFLIX.COM', '2025-02-15'),
        makeTx('3', 199, 'SPOTIFY', '2025-01-10'),
        makeTx('4', 799, 'NETFLIX.COM', '2025-03-15'),
        makeTx('5', 199, 'SPOTIFY', '2025-02-10'),
      ];

      const groups = service.groupTransactions(txs);
      expect(groups.length).toBe(2);

      const netflixGroup = groups.find((g) => g[0].description === 'NETFLIX.COM');
      expect(netflixGroup).toBeDefined();
      expect(netflixGroup!.length).toBe(3);

      const spotifyGroup = groups.find((g) => g[0].description === 'SPOTIFY');
      expect(spotifyGroup).toBeDefined();
      expect(spotifyGroup!.length).toBe(2);
    });

    it('should not group different amounts', () => {
      const txs = [
        makeTx('1', 799, 'NETFLIX.COM', '2025-01-15'),
        makeTx('2', 999, 'NETFLIX.COM', '2025-02-15'),
      ];

      const groups = service.groupTransactions(txs);
      expect(groups.length).toBe(2);
    });
  });

  describe('computeIntervals', () => {
    it('should compute day intervals between sorted transactions', () => {
      const txs = [
        makeTx('1', 799, 'N', '2025-01-15'),
        makeTx('2', 799, 'N', '2025-02-14'),
        makeTx('3', 799, 'N', '2025-03-16'),
      ];

      const intervals = service.computeIntervals(txs);
      expect(intervals).toEqual([30, 30]);
    });

    it('should handle unsorted input', () => {
      const txs = [
        makeTx('3', 799, 'N', '2025-03-15'),
        makeTx('1', 799, 'N', '2025-01-15'),
        makeTx('2', 799, 'N', '2025-02-14'),
      ];

      const intervals = service.computeIntervals(txs);
      expect(intervals).toEqual([30, 29]);
    });
  });

  describe('detectCycle', () => {
    it('should detect MONTHLY cycle', () => {
      const result = service.detectCycle([30, 31, 29, 30]);
      expect(result).not.toBeNull();
      expect(result!.billingCycle).toBe('MONTHLY');
    });

    it('should detect WEEKLY cycle', () => {
      const result = service.detectCycle([7, 7, 8, 7]);
      expect(result).not.toBeNull();
      expect(result!.billingCycle).toBe('WEEKLY');
    });

    it('should detect YEARLY cycle', () => {
      const result = service.detectCycle([365, 366, 364]);
      expect(result).not.toBeNull();
      expect(result!.billingCycle).toBe('YEARLY');
    });

    it('should detect QUARTERLY cycle', () => {
      const result = service.detectCycle([90, 92, 89]);
      expect(result).not.toBeNull();
      expect(result!.billingCycle).toBe('QUARTERLY');
    });

    it('should return null for irregular intervals', () => {
      const result = service.detectCycle([15, 45, 10, 60]);
      expect(result).toBeNull();
    });
  });

  describe('computeScore', () => {
    it('should return high score for perfect regularity', () => {
      const score = service.computeScore([30, 30, 30, 30, 30], 30);
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return lower score for some deviation', () => {
      const score = service.computeScore([30, 35, 25, 30], 30);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1);
    });

    it('should return 0 for empty intervals', () => {
      expect(service.computeScore([], 30)).toBe(0);
    });

    it('should give bonus for more transactions', () => {
      const few = service.computeScore([30, 30], 30);
      const many = service.computeScore([30, 30, 30, 30, 30, 30], 30);
      expect(many).toBeGreaterThan(few);
    });
  });

  describe('pickBestName', () => {
    it('should pick the most frequent name', () => {
      const name = service.pickBestName([
        'Netflix',
        'Netflix',
        'NETFLIX',
        'Netflix',
      ]);
      expect(name).toBe('Netflix');
    });

    it('should return first if all unique', () => {
      const name = service.pickBestName(['A', 'B', 'C']);
      expect(name).toBe('A');
    });
  });
});

function makeTx(
  id: string,
  amount: number,
  description: string,
  date: string,
) {
  return {
    id,
    amount,
    currency: 'RUB',
    description,
    transactionDate: new Date(date),
    subscriptionId: null,
  };
}
