import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { moveArticle, deleteArticle, getBreadcrumbs } from '@/lib/tailManager';

// 記事取得
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
    
    // 記事とTailの所有権確認
    const article = await prisma.article.findFirst({
      where: {
        id: resolvedParams.id,
        tail: {
          userId: user.id,
        },
      },
      include: {
        tail: true,
        parent: {
          select: { id: true, title: true, path: true },
        },
        children: {
          select: { id: true, title: true, path: true, isFolder: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    
    if (!article) {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      );
    }
    
    // パンくずリスト取得
    const breadcrumbs = await getBreadcrumbs(resolvedParams.id);
    
    return NextResponse.json({
      ...article,
      breadcrumbs,
    });
  } catch (error) {
    console.error('記事取得エラー:', error);
    return NextResponse.json(
      { error: '記事の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 記事更新
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
    const { title, content, parentId } = body;
    
    // 記事の所有権確認
    const existingArticle = await prisma.article.findFirst({
      where: {
        id: resolvedParams.id,
        tail: {
          userId: user.id,
        },
      },
    });
    
    if (!existingArticle) {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      );
    }
    
    // 親の変更がある場合は移動処理
    if (parentId !== undefined && parentId !== existingArticle.parentId) {
      await moveArticle(resolvedParams.id, parentId);
    }
    
    // 記事内容の更新
    const updatedArticle = await prisma.article.update({
      where: { id: resolvedParams.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        // パスも更新が必要な場合は別途実装
      },
    });
    
    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('記事更新エラー:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('循環参照')) {
        return NextResponse.json(
          { error: '循環参照が発生するため移動できません' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('階層は5階層まで')) {
        return NextResponse.json(
          { error: '階層は5階層までです' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: '記事の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 記事削除
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
    
    // 記事の所有権確認
    const article = await prisma.article.findFirst({
      where: {
        id: resolvedParams.id,
        tail: {
          userId: user.id,
        },
      },
    });
    
    if (!article) {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      );
    }
    
    await deleteArticle(resolvedParams.id);
    
    return NextResponse.json({ message: '記事が削除されました' });
  } catch (error) {
    console.error('記事削除エラー:', error);
    return NextResponse.json(
      { error: '記事の削除に失敗しました' },
      { status: 500 }
    );
  }
}