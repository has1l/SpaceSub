import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);
  private openai: OpenAI | null = null;

  constructor(private readonly analytics: AnalyticsService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey, timeout: 15_000 });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI insight endpoint disabled');
    }
  }

  async getInsight(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<{ text: string; generatedAt: string }> {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'AI-анализ временно недоступен. Ключ API не настроен.',
      );
    }

    const [overview, categories, services, periods, scores, recommendations] =
      await Promise.all([
        this.analytics.getOverview(userId, from, to),
        this.analytics.getByCategory(userId, from, to),
        this.analytics.getByService(userId, 8, from, to),
        this.analytics.getByPeriod(userId, 'month', from, to),
        this.analytics.getScores(userId),
        this.analytics.getRecommendations(userId),
      ]);

    const userData = {
      overview,
      categories,
      topServices: services,
      periodDynamics: periods,
      healthScores: scores,
      recommendations,
    };

    const systemPrompt = `Ты — AI финансовый аналитик в приложении SpaceSub (управление подписками).
Проанализируй данные подписок пользователя и дай краткий, полезный отчёт на русском языке.

Правила:
- Называй конкретные сервисы и суммы в рублях
- Структура ответа: общая картина -> проблемные зоны -> 2-3 конкретных совета
- Длина: 150-300 слов
- Тон: дружелюбный, но профессиональный
- Не повторяй данные просто так — делай выводы и находи закономерности
- Если есть рекомендации по отмене или оптимизации — упомяни их
- Если данных мало — так и скажи, не выдумывай`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userData) },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const text =
        response.choices[0]?.message?.content?.trim() ??
        'Не удалось сформировать анализ.';

      return { text, generatedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error('OpenAI API error', error);
      throw new ServiceUnavailableException(
        'Не удалось получить AI-анализ. Попробуйте позже.',
      );
    }
  }
}
