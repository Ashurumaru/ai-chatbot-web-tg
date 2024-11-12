import OpenAI from 'openai';

import { auth } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/db/queries';

import { generateTitleFromUserMessage } from '../../actions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { id, messages, modelId } = await request.json();
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = 'gpt-3.5-turbo';

  // Конвертация сообщений для OpenAI API
  const coreMessages = messages.map((msg: { role: string; content: string }) => ({
    role: msg.role,
    content: msg.content,
  }));

  const userMessage = coreMessages[coreMessages.length - 1];
  const chat = await getChatById({ id });

  // Создаем заголовок для чата, если он еще не создан
  if (!chat) {
    const title = await generateTitleFromUserMessage(userMessage.content);
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, id, createdAt: new Date(), chatId: id }],
  });

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: coreMessages,
      max_tokens: 500,
    });

    const assistantMessage = response.choices[0].message;

    await saveMessages({
      messages: [{ ...assistantMessage, id, chatId: id, createdAt: new Date() }],
    });

    return new Response(JSON.stringify(assistantMessage), { status: 200 });
  } catch (error) {
    console.error('Error processing OpenAI API request:', error);
    return new Response('Failed to process request', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const session = await auth();

  if (!id || !session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
