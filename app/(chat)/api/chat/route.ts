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
  console.log('Starting POST request processing...');

  const { id, messages, modelId } = await request.json();
  console.log('Request data:', { id, messages, modelId });

  const session = await auth();
  console.log('Session data:', session);

  if (!session || !session.user || !session.user.id) {
    console.error('Unauthorized access attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  const model = 'gpt-3.5-turbo';

  // Конвертация сообщений для OpenAI API
  const coreMessages = messages.map((msg: { role: string; content: string }) => ({
    role: msg.role,
    content: msg.content,
  }));

  console.log('Formatted messages for OpenAI API:', coreMessages);

  const userMessage = coreMessages[coreMessages.length - 1];
  const chat = await getChatById({ id });
  console.log('Retrieved chat data:', chat);

  // Создаем заголовок для чата, если он еще не создан
  if (!chat) {
    console.log('Generating title for new chat...');
    const title = await generateTitleFromUserMessage(userMessage.content);
    console.log('Generated title:', title);
    await saveChat({ id, userId: session.user.id, title });
    console.log('Chat saved to database with title:', title);
  }

  await saveMessages({
    messages: [{ ...userMessage, id, createdAt: new Date(), chatId: id }],
  });
  console.log('User message saved to database:', userMessage);

  try {
    console.log('Sending request to OpenAI API...');
    const response = await openai.chat.completions.create({
      model,
      messages: coreMessages,
      max_tokens: 500,
    });

    console.log('OpenAI API Response:', response);

    if (!response || !response.choices || !response.choices[0]?.message) {
      console.error('Invalid response structure from OpenAI:', response);
      return new Response('Failed to process request: Invalid OpenAI response', { status: 500 });
    }

    const assistantMessage = response.choices[0].message;
    console.log('Assistant message received:', assistantMessage);

    await saveMessages({
      messages: [{ ...assistantMessage, id, chatId: id, createdAt: new Date() }],
    });
    console.log('Assistant message saved to database:', assistantMessage);

    return new Response(JSON.stringify(assistantMessage), { status: 200 });
  } catch (error) {
    console.error('Error during OpenAI API request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500 });
  }
}

export async function DELETE(request: Request) {
  console.log('Starting DELETE request processing...');

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  console.log('Chat ID to delete:', id);

  const session = await auth();
  console.log('Session data:', session);

  if (!id || !session || !session.user) {
    console.error('Unauthorized access attempt for delete');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });
    console.log('Chat data retrieved for deletion:', chat);

    if (chat.userId !== session.user.id) {
      console.error('Unauthorized deletion attempt by user:', session.user.id);
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    console.log('Chat deleted successfully:', id);

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error during chat deletion:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
