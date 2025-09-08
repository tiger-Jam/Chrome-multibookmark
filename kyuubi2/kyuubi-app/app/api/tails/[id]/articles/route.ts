import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createArticle, getArticleTree } from '@/lib/tailManager';

// Tail内の記事一覧取得（ツリー構造）
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
    
    // Tailの所有権確認
    const tail = await prisma.tail.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
    });
    
    if (!tail) {
      return NextResponse.json(
        { error: 'Tailが見つかりません' },
        { status: 404 }
      );
    }
    
    const articleTree = await getArticleTree(resolvedParams.id);
    
    return NextResponse.json(articleTree);
  } catch (error) {
    console.error('記事ツリー取得エラー:', error);
    return NextResponse.json(
      { error: '記事の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// Tail内に新規記事作成
export async function POST(
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
    
    // Tailの所有権確認
    const tail = await prisma.tail.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
    });
    
    if (!tail) {
      return NextResponse.json(
        { error: 'Tailが見つかりません' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { title, content, parentId, isFolder } = body;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'titleとcontentは必須です' },
        { status: 400 }
      );
    }
    
    const article = await createArticle(resolvedParams.id, {
      title,
      content,
      parentId,
      isFolder: isFolder || false,
    });
    
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('記事作成エラー:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('階層は5階層まで')) {
        return NextResponse.json(
          { error: '階層は5階層までです' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('同じパスの記事が既に存在')) {
        return NextResponse.json(
          { error: '同じ名前の記事が既に存在します' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('親記事が見つかりません')) {
        return NextResponse.json(
          { error: '指定された親記事が見つかりません' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: '記事の作成に失敗しました' },
      { status: 500 }
    );
  }
}