// app/(chat)/actions.ts

export async function saveModelId(model: string) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/saveModelId`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
}

export async function generateTitleFromUserMessage(message: string): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/generateTitle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await response.json();
  return data.title;
}
