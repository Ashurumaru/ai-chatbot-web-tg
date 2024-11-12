import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Функция задержки
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Сохранение ID модели в cookies
export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

// Генерация заголовка на основе первого сообщения пользователя
export async function generateTitleFromUserMessage(message: string): Promise<string> {
  await sleep(500);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Generate a short title for the first message in a chat.' },
        { role: 'user', content: message },
      ],
      max_tokens: 50,
    });

    const title = response.choices[0]?.message?.content?.trim();
    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}
