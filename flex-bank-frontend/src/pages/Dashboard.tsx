import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import type { Account } from '../types';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', currency: 'RUB', balance: '' });
  const [creating, setCreating] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/accounts', {
        name: form.name,
        currency: form.currency,
        balance: Number(form.balance) || 0,
      });
      setForm({ name: '', currency: 'RUB', balance: '' });
      setShowForm(false);
      await fetchAccounts();
    } finally {
      setCreating(false);
    }
  };

  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(balance);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Мои счета</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          {showForm ? 'Отмена' : '+ Новый счёт'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Создать счёт</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Название</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Основной счёт"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
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
              <label className="block text-gray-400 text-sm mb-1.5">Баланс</label>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !form.name}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      {accounts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-600 text-5xl mb-4">🏦</div>
          <p className="text-gray-500 text-lg">У вас пока нет счетов</p>
          <p className="text-gray-600 text-sm mt-1">Создайте первый счёт, чтобы начать</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Link
              key={acc.id}
              to={`/accounts/${acc.id}`}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{acc.name}</span>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-md">
                  {acc.currency}
                </span>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {formatBalance(acc.balance, acc.currency)}
              </div>
              <div className="text-gray-600 text-xs mt-3">
                Открыт {new Date(acc.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
