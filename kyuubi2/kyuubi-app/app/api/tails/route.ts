import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createTail, getTailsByUser } from '@/lib/tailManager';

// Tail一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // メールアドレスでユーザーを取得
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    const tails = await getTailsByUser(user.id);
    
    return NextResponse.json(tails);
  } catch (error) {
    console.error('Tail取得エラー:', error);
    return NextResponse.json(
      { error: 'Tailの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 新規Tail作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { name, displayName, description } = body;
    
    if (!name || !displayName) {
      return NextResponse.json(
        { error: 'nameとdisplayNameは必須です' },
        { status: 400 }
      );
    }
    
    const tail = await createTail(user.id, {
      name,
      displayName,
      description,
    });
    
    return NextResponse.json(tail, { status: 201 });
  } catch (error) {
    console.error('Tail作成エラー:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のTailが既に存在します' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Tailの作成に失敗しました' },
      { status: 500 }
    );
  }
}