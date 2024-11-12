import { cookies } from 'next/headers';

import { DEFAULT_MODEL_NAME, models } from '@/ai/models';
import { Chat } from '@/components/custom/chat';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  const id = generateUUID();

  // Используем await для получения cookies, так как это возвращает промис
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;

  const selectedModelId =
      models.find((model) => model.id === modelIdFromCookie)?.id ||
      DEFAULT_MODEL_NAME;

  return (
      <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedModelId={selectedModelId}
      />
  );
}
