// app/api/chat/saveModelId/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { model } = await request.json();

    // Создаем ответ
    const response = NextResponse.json({ success: true });

    // Устанавливаем cookie через response.cookies
    response.cookies.set('model-id', model);

    return response;
}
