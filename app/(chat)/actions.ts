// app/(chat)/actions.ts

export async function saveModelId(model: string) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/saveModelId`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
}

export async function generateTitleFromUserMessage(message: string): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat/generateTitle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      console.error('Failed to generate title. Response status:', response.status);
      return 'New Chat';
    }

    const data = await response.json();
    console.log('Generated title from API response:', data.title);
    return data.title || 'New Chat';
  } catch (error) {
    console.error('Error fetching title from API:', error);
    return 'New Chat';
  }
}
