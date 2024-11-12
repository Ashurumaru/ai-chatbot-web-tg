// app/api/saveModelId/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { model } = await request.json();
    const cookieStore = await cookies();
    cookieStore.set('model-id', model);

    return NextResponse.json({ success: true });
}
