import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// 記事一覧を取得
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const articles = await prisma.article.findMany({
      where: {
        tail: {
          userId: session.user.id,
        },
      },
      include: {
        tail: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('記事取得エラー:', error);
    return NextResponse.json({ error: '記事の取得に失敗しました' }, { status: 500 });
  }
}

// 新しい記事を作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, tags = [] } = body;

    // デフォルトTailを取得または作成
    let defaultTail = await prisma.tail.findFirst({
      where: {
        userId: session.user.id,
        name: 'default',
      },
    });
    
    if (!defaultTail) {
      defaultTail = await prisma.tail.create({
        data: {
          name: 'default',
          displayName: 'デフォルト',
          description: 'デフォルトのTail',
          filePath: `~/Documents/Tails/default.tail/`,
          userId: session.user.id,
        },
      });
    }

    const article = await prisma.article.create({
      data: {
        title,
        content,
        tailId: defaultTail.id,
        path: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`,
        wordCount: content.length,
        tags: {
          create: await Promise.all(
            tags.map(async (tagName: string) => {
              const tag = await prisma.tag.upsert({
                where: {
                  tailId_name: {
                    tailId: defaultTail.id,
                    name: tagName,
                  },
                },
                update: {},
                create: {
                  name: tagName,
                  tailId: defaultTail.id,
                },
              });
              return {
                tag: {
                  connect: { id: tag.id },
                },
              };
            })
          ),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('記事作成エラー:', error);
    return NextResponse.json({ error: '記事の作成に失敗しました' }, { status: 500 });
  }
}

// 記事を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, tags = [] } = body;

    if (!id) {
      return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
    }

    // 既存のタグ関連を削除
    await prisma.articleTag.deleteMany({
      where: { articleId: id },
    });

    // 記事を更新（自分の記事のみ）
    const article = await prisma.article.update({
      where: { 
        id,
        tail: {
          userId: session.user.id, // 自分の記事のみ更新可能
        },
      },
      data: {
        title,
        content,
        wordCount: content.length,
        tags: {
          create: await Promise.all(
            tags.map(async (tagName: string) => {
              const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: {
                  name: tagName,
                  userId: session.user.id,
                },
              });
              return {
                tag: {
                  connect: { id: tag.id },
                },
              };
            })
          ),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('記事更新エラー:', error);
    return NextResponse.json({ error: '記事の更新に失敗しました' }, { status: 500 });
  }
}

// 記事を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
    }

    // 自分の記事のみ削除可能
    await prisma.article.delete({
      where: { 
        id,
        tail: {
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('記事削除エラー:', error);
    return NextResponse.json({ error: '記事の削除に失敗しました' }, { status: 500 });
  }
}