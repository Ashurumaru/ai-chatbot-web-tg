export async function saveModelId(model: string) {
  await fetch('/api/saveModelId', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
}

export async function generateTitleFromUserMessage(message: string) {
  const response = await fetch('/api/generateTitle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const data = await response.json();
  return data.title;
}
