import { PrismaClient, TransactionType, TransactionCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Demo user — will be linked to a real Yandex account on first OAuth login.
  // This seed creates predictable data for integration testing.
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

  // Main checking account
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

  // Savings account
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

  // Demo transactions for the checking account
  const now = new Date();
  const transactions = [
    { days: -1, amount: -199, desc: 'Яндекс Плюс', merchant: 'Yandex', type: TransactionType.EXPENSE, cat: TransactionCategory.SUBSCRIPTIONS },
    { days: -2, amount: -549, desc: 'Spotify Premium', merchant: 'Spotify', type: TransactionType.EXPENSE, cat: TransactionCategory.SUBSCRIPTIONS },
    { days: -3, amount: -4500, desc: 'Пятёрочка', merchant: 'Pyaterochka', type: TransactionType.EXPENSE, cat: TransactionCategory.SUPERMARKETS },
    { days: -4, amount: -299, desc: 'iCloud+ 50GB', merchant: 'Apple', type: TransactionType.EXPENSE, cat: TransactionCategory.DIGITAL_SERVICES },
    { days: -5, amount: 85000, desc: 'Зарплата', merchant: null, type: TransactionType.INCOME, cat: TransactionCategory.OTHER },
    { days: -7, amount: -1200, desc: 'Uber поездка', merchant: 'Uber', type: TransactionType.EXPENSE, cat: TransactionCategory.TRANSPORT },
    { days: -8, amount: -3200, desc: 'Ресторан "Место"', merchant: 'Mesto', type: TransactionType.EXPENSE, cat: TransactionCategory.RESTAURANTS },
    { days: -10, amount: -890, desc: 'Netflix', merchant: 'Netflix', type: TransactionType.EXPENSE, cat: TransactionCategory.SUBSCRIPTIONS },
    { days: -12, amount: -15000, desc: 'Перевод на накопительный', merchant: null, type: TransactionType.TRANSFER, cat: TransactionCategory.TRANSFERS },
    { days: -14, amount: -2100, desc: 'Аптека "Здоровье"', merchant: 'Zdorovye', type: TransactionType.EXPENSE, cat: TransactionCategory.HEALTH },
  ];

  let created = 0;
  for (const t of transactions) {
    const date = new Date(now);
    date.setDate(date.getDate() + t.days);

    await prisma.transaction.upsert({
      where: { id: `seed-tx-${String(-t.days).padStart(3, '0')}` },
      update: {},
      create: {
        id: `seed-tx-${String(-t.days).padStart(3, '0')}`,
        accountId: checking.id,
        date,
        amount: t.amount,
        description: t.desc,
        merchant: t.merchant,
        type: t.type,
        category: t.cat,
      },
    });
    created++;
  }

  console.log(`Seeded ${created} transactions for ${checking.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
