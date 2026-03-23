import { PrismaClient, TransactionType, TransactionCategory } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { yandexId: 'demo-seed-user' },
    update: {},
    create: {
      yandexId: 'demo-seed-user',
      email: 'demo@flexbank.test',
      name: 'Demo User',
    },
  });

  console.log(`Seeded user: ${user.id} (${user.email})`);

  const checking = await prisma.account.upsert({
    where: { id: 'seed-checking-001' },
    update: {},
    create: {
      id: 'seed-checking-001',
      userId: user.id,
      name: 'Основной счёт',
      currency: 'RUB',
      initialBalance: 150000,
    },
  });

  const savings = await prisma.account.upsert({
    where: { id: 'seed-savings-001' },
    update: {},
    create: {
      id: 'seed-savings-001',
      userId: user.id,
      name: 'Накопительный счёт',
      currency: 'RUB',
      initialBalance: 500000,
    },
  });

  console.log(`Seeded accounts: ${checking.name}, ${savings.name}`);

  // ── Recurring Payments (subscriptions) ──
  const subscriptions = [
    { id: 'seed-rp-yandex',  merchant: 'Yandex',  amount: -199, desc: 'Яндекс Плюс',   periodDays: 30, cat: TransactionCategory.SUBSCRIPTIONS },
    { id: 'seed-rp-spotify', merchant: 'Spotify', amount: -549, desc: 'Spotify Premium', periodDays: 30, cat: TransactionCategory.SUBSCRIPTIONS },
    { id: 'seed-rp-netflix', merchant: 'Netflix', amount: -890, desc: 'Netflix',         periodDays: 30, cat: TransactionCategory.SUBSCRIPTIONS },
    { id: 'seed-rp-icloud',  merchant: 'Apple',   amount: -299, desc: 'iCloud+ 50GB',   periodDays: 30, cat: TransactionCategory.DIGITAL_SERVICES },
  ];

  let rpCreated = 0;
  let txCreated = 0;

  for (const sub of subscriptions) {
    // Create recurring payment
    await prisma.recurringPayment.upsert({
      where: { id: sub.id },
      update: {},
      create: {
        id: sub.id,
        accountId: checking.id,
        merchant: sub.merchant,
        amount: sub.amount,
        category: sub.cat,
        periodDays: sub.periodDays,
        nextChargeDate: daysFromNow(sub.periodDays - (txCreated % 7) - 1),
        status: 'ACTIVE',
      },
    });
    rpCreated++;

    // Generate 3-4 months of transaction history
    const monthsBack = 4;
    for (let m = 0; m < monthsBack; m++) {
      const dayOffset = m * sub.periodDays + (rpCreated * 2); // stagger dates
      if (dayOffset > 120) break;

      const txId = `seed-rptx-${sub.merchant.toLowerCase()}-${m}`;
      await prisma.transaction.upsert({
        where: { id: txId },
        update: {},
        create: {
          id: txId,
          accountId: checking.id,
          date: daysAgo(dayOffset),
          amount: sub.amount,
          description: sub.desc,
          merchant: sub.merchant,
          type: TransactionType.EXPENSE,
          category: sub.cat,
        },
      });
      txCreated++;
    }
  }

  console.log(`Seeded ${rpCreated} recurring payments, ${txCreated} subscription transactions`);

  // ── One-off transactions ──
  const oneOffs = [
    { id: 'seed-tx-grocery',    days: -3,  amount: -4500,  desc: 'Пятёрочка',              merchant: 'Pyaterochka', type: TransactionType.EXPENSE,  cat: TransactionCategory.SUPERMARKETS },
    { id: 'seed-tx-salary',     days: -5,  amount: 85000,  desc: 'Зарплата',               merchant: null,          type: TransactionType.INCOME,   cat: TransactionCategory.OTHER },
    { id: 'seed-tx-uber',       days: -7,  amount: -1200,  desc: 'Uber поездка',           merchant: 'Uber',        type: TransactionType.EXPENSE,  cat: TransactionCategory.TRANSPORT },
    { id: 'seed-tx-restaurant', days: -8,  amount: -3200,  desc: 'Ресторан "Место"',       merchant: 'Mesto',       type: TransactionType.EXPENSE,  cat: TransactionCategory.RESTAURANTS },
    { id: 'seed-tx-transfer',   days: -12, amount: -15000, desc: 'Перевод на накопительный', merchant: null,         type: TransactionType.TRANSFER, cat: TransactionCategory.TRANSFERS },
    { id: 'seed-tx-pharmacy',   days: -14, amount: -2100,  desc: 'Аптека "Здоровье"',      merchant: 'Zdorovye',    type: TransactionType.EXPENSE,  cat: TransactionCategory.HEALTH },
  ];

  for (const t of oneOffs) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        accountId: checking.id,
        date: daysAgo(-t.days),
        amount: t.amount,
        description: t.desc,
        merchant: t.merchant,
        type: t.type,
        category: t.cat,
      },
    });
  }

  console.log(`Seeded ${oneOffs.length} one-off transactions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
