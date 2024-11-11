import {
  convertToCoreMessages,
  Message,
  StreamData,
  streamObject,
  streamText,
} from 'ai';
import { z } from 'zod';

import { customModel } from '@/ai';
import { models } from '@/ai/models';
import { blocksPrompt, regularPrompt, systemPrompt } from '@/ai/prompts';
import { auth } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from '@/db/queries';
import { Suggestion } from '@/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

type AllowedTools =
    | 'createDocument'
    | 'updateDocument'
    | 'requestSuggestions'
    | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      modelId,
    }: { id: string; messages: Array<Message>; modelId: string } =
        await request.json();

    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const model = models.find((model) => model.id === modelId);
    if (!model) {
      return new Response('Model not found', { status: 404 });
    }

    const coreMessages = convertToCoreMessages(messages);
    const userMessage = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId: session.user.id, title });
    }

    await saveMessages({
      messages: [
        { ...userMessage, id: generateUUID(), createdAt: new Date(), chatId: id },
      ],
    });

    const streamingData = new StreamData();

    const result = await streamText({
      model: customModel(model.apiIdentifier),
      system: systemPrompt,
      messages: coreMessages,
      maxSteps: 5,
      experimental_activeTools: allTools,
      tools: {
        getWeather: {
          description: 'Get the current weather at a location',
          parameters: z.object({
            latitude: z.number(),
            longitude: z.number(),
          }),
          execute: async ({ latitude, longitude }) => {
            try {
              const response = await fetch(
                  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
              );
              return await response.json();
            } catch (error) {
              console.error('Error fetching weather data:', error);
              throw new Error('Weather data fetch failed');
            }
          },
        },
        createDocument: {
          description: 'Create a document for a writing activity',
          parameters: z.object({
            title: z.string(),
          }),
          execute: async ({ title }) => {
            const id = generateUUID();
            let draftText: string = '';
            streamingData.append({ type: 'id', content: id });
            streamingData.append({ type: 'title', content: title });
            streamingData.append({ type: 'clear', content: '' });

            const { fullStream } = await streamText({
              model: customModel(model.apiIdentifier),
              system:
                  'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
              prompt: title,
            });

            for await (const delta of fullStream) {
              const { type } = delta;
              if (type === 'text-delta') {
                const { textDelta } = delta;
                draftText += textDelta;
                streamingData.append({ type: 'text-delta', content: textDelta });
              }
            }

            streamingData.append({ type: 'finish', content: '' });

            if (session.user && session.user.id) {
              await saveDocument({
                id,
                title,
                content: draftText,
                userId: session.user.id,
              });
            }

            return { id, title, content: 'Document created successfully' };
          },
        },
        updateDocument: {
          description: 'Update a document with the given description',
          parameters: z.object({
            id: z.string().describe('The ID of the document to update'),
            description: z
                .string()
                .describe('The description of changes that need to be made'),
          }),
          execute: async ({ id, description }) => {
            const document = await getDocumentById({ id });
            if (!document) return { error: 'Document not found' };

            let draftText = document.content;

            const { fullStream } = await streamText({
              model: customModel(model.apiIdentifier),
              system:
                  'You are a helpful writing assistant. Update the piece of writing based on the description provided.',
              prompt: description,
            });

            for await (const delta of fullStream) {
              if (delta.type === 'text-delta') {
                draftText += delta.textDelta;
              }
            }

            if (session.user && session.user.id) {
              await saveDocument({
                id,
                title: document.title,
                content: draftText,
                userId: session.user.id,
              });
            }

            return { id, title: document.title, content: 'Document updated successfully' };
          },
        },
        requestSuggestions: {
          description: 'Request suggestions for a document',
          parameters: z.object({
            documentId: z.string().describe('The ID of the document to request edits'),
          }),
          execute: async ({ documentId }) => {
            const document = await getDocumentById({ id: documentId });
            if (!document || !document.content) return { error: 'Document not found' };

            let suggestions: Suggestion[] = [];

            const { elementStream } = await streamObject({
              model: customModel(model.apiIdentifier),
              system: 'Provide suggestions to improve the text provided.',
              prompt: document.content,
              schema: z.object({
                originalSentence: z.string(),
                suggestedSentence: z.string(),
                description: z.string(),
              }),
            });

            for await (const element of elementStream) {
              suggestions.push({
                originalText: element.originalSentence,
                suggestedText: element.suggestedSentence,
                description: element.description,
                id: generateUUID(),
                documentId,
                isResolved: false,
              });
            }

            if (session.user && session.user.id) {
              await saveSuggestions({
                suggestions: suggestions.map((s) => ({
                  ...s,
                  userId: session.user.id,
                  createdAt: new Date(),
                })),
              });
            }

            return { id: documentId, title: document.title, message: 'Suggestions added successfully' };
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        if (session.user && session.user.id) {
          try {
            const sanitizedMessages = sanitizeResponseMessages(responseMessages);
            await saveMessages({
              messages: sanitizedMessages.map((message) => ({
                id: generateUUID(),
                chatId: id,
                role: message.role,
                content: message.content,
                createdAt: new Date(),
              })),
            });
          } catch (error) {
            console.error('Error saving chat messages:', error);
          }
        }
        streamingData.close();
      },
    });

    return result.toDataStreamResponse({ data: streamingData });
  } catch (error) {
    console.error('POST request error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return new Response('Not Found', { status: 404 });

    const session = await auth();
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('DELETE request error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
