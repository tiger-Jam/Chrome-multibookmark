import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTail, updateTail, deleteTail } from '@/lib/tailManager';

// 個別Tail取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const resolvedParams = await params;
    
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
    
    const tail = await getTail(resolvedParams.id, user.id);
    
    if (!tail) {
      return NextResponse.json(
        { error: 'Tailが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(tail);
  } catch (error) {
    console.error('Tail取得エラー:', error);
    return NextResponse.json(
      { error: 'Tailの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// Tail更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const resolvedParams = await params;
    
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
    const { displayName, description } = body;
    
    const updatedTail = await updateTail(resolvedParams.id, user.id, {
      displayName,
      description,
    });
    
    return NextResponse.json(updatedTail);
  } catch (error) {
    console.error('Tail更新エラー:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Tailが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Tailの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// Tail削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const resolvedParams = await params;
    
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
    
    await deleteTail(resolvedParams.id, user.id);
    
    return NextResponse.json({ message: 'Tailが削除されました' });
  } catch (error) {
    console.error('Tail削除エラー:', error);
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Tailが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Tailの削除に失敗しました' },
      { status: 500 }
    );
  }
}