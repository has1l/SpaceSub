import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import type { Account, Transaction } from '../types';
import Spinner from '../components/Spinner';

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'RUB',
    description: '',
  });

  const fetchData = async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        api.get(`/accounts`),
        api.get(`/accounts/${id}/transactions`, {
          params: { ...(from && { from }), ...(to && { to }) },
        }),
      ]);
      const acc = accRes.data.find((a: Account) => a.id === id);
      setAccount(acc || null);
      setTransactions(txRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, from, to]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post(`/accounts/${id}/transactions`, {
        date: new Date(form.date).toISOString(),
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description,
      });
      setForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'RUB',
        description: '',
      });
      setShowForm(false);
      setLoading(true);
      await fetchData();
    } finally {
      setCreating(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
    return amount < 0 ? `−${formatted}` : `+${formatted}`;
  };

  if (loading) return <Spinner />;
  if (!account) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Счёт не найден</p>
        <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
          Назад к счетам
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm mb-6 inline-block transition-colors">
        ← Назад к счетам
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">{account.name}</p>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: account.currency,
                minimumFractionDigits: 0,
              }).format(account.balance)}
            </p>
          </div>
          <span className="text-sm text-gray-500 bg-gray-800 px-3 py-1.5 rounded-lg">
            {account.currency}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">Транзакции</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            placeholder="От"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            placeholder="До"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {showForm ? 'Отмена' : '+ Транзакция'}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Новая транзакция</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Дата</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Сумма</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="-799"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Валюта</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Описание</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="NETFLIX.COM"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !form.amount || !form.description}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Нет транзакций</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 text-xs font-medium px-6 py-3">Дата</th>
                <th className="text-left text-gray-500 text-xs font-medium px-6 py-3">Описание</th>
                <th className="text-right text-gray-500 text-xs font-medium px-6 py-3">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(tx.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-white text-sm">{tx.description}</td>
                  <td className={`px-6 py-4 text-sm text-right font-medium ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatAmount(tx.amount, tx.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
