'use server';

import { CoreMessage, CoreUserMessage, generateText } from 'ai';
import { cookies } from 'next/headers';

import { customModel } from '@/ai';

// Функция задержки, принимает время в миллисекундах
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Сохранение ID модели в cookies
export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('model-id', model);
}

// Генерация заголовка на основе первого сообщения пользователя с задержкой перед запросом к API
export async function generateTitleFromUserMessage({
                                                     message,
                                                   }: {
  message: CoreUserMessage;
}): Promise<string> {
  await sleep(500);

  try {
    const { text: title } = await generateText({
      model: customModel('gpt-3.5-turbo'),
      system: `
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons`,
      prompt: JSON.stringify(message),
    });

    return title;
  } catch (error) {
    console.error('Error generating title:', error);

    // Возвращаем альтернативный заголовок по умолчанию
    return 'New Chat';
  }
}
