// app/api/generateTitle/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    const { message } = await request.json();

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Generate a short title for the first message in a chat.' },
                { role: 'user', content: message },
            ],
            max_tokens: 50,
        });

        const title = response.choices[0]?.message?.content?.trim() || 'New Chat';
        return NextResponse.json({ title });
    } catch (error) {
        console.error('Error generating title:', error);
        return NextResponse.json({ title: 'New Chat' }, { status: 500 });
    }
}
