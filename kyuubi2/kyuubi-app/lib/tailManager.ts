import { prisma } from '@/lib/prisma';
import { Tail, Article, Prisma } from '@prisma/client';

// Tail管理の基本操作
export async function createTail(userId: string, data: {
  name: string;
  displayName: string;
  description?: string;
}) {
  // nameをサニタイズ（URLセーフに）
  const sanitizedName = data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  const tail = await prisma.tail.create({
    data: {
      name: sanitizedName,
      displayName: data.displayName,
      description: data.description,
      filePath: `~/Documents/Tails/${sanitizedName}.tail/`,
      userId,
    },
    include: {
      articles: true,
    },
  });
  
  // デフォルトのルート記事を作成
  await prisma.article.create({
    data: {
      tailId: tail.id,
      title: 'Welcome',
      content: `# ${data.displayName}\n\n${data.description || 'Tailへようこそ！'}`,
      path: 'index.md',
      level: 0,
      order: 0,
      isFolder: false,
    },
  });
  
  return tail;
}

export async function getTailsByUser(userId: string) {
  return prisma.tail.findMany({
    where: { userId },
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getTail(tailId: string, userId: string) {
  return prisma.tail.findFirst({
    where: {
      id: tailId,
      userId,
    },
    include: {
      articles: {
        orderBy: [
          { level: 'asc' },
          { order: 'asc' },
        ],
      },
    },
  });
}

export async function updateTail(tailId: string, userId: string, data: {
  displayName?: string;
  description?: string;
}) {
  return prisma.tail.update({
    where: {
      id: tailId,
      userId,
    },
    data,
  });
}

export async function deleteTail(tailId: string, userId: string) {
  // ユーザー所有権を確認しながら削除
  return prisma.tail.delete({
    where: {
      id: tailId,
      userId,
    },
  });
}

// 記事の階層構造管理
export async function createArticle(tailId: string, data: {
  title: string;
  content: string;
  parentId?: string;
  isFolder?: boolean;
}) {
  // 親記事が指定されている場合、階層レベルをチェック
  let level = 0;
  let path = `${data.title.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.md`;
  
  if (data.parentId) {
    const parent = await prisma.article.findUnique({
      where: { id: data.parentId },
    });
    
    if (!parent) {
      throw new Error('親記事が見つかりません');
    }
    
    // 階層レベル制限（5階層まで）
    if (parent.level >= 4) {
      throw new Error('階層は5階層までです');
    }
    
    level = parent.level + 1;
    const parentPath = parent.path.replace(/\.md$/, '');
    path = `${parentPath}/${path}`;
  }
  
  // パス重複チェック
  const existing = await prisma.article.findFirst({
    where: {
      tailId,
      path,
    },
  });
  
  if (existing) {
    throw new Error('同じパスの記事が既に存在します');
  }
  
  // 同階層での最大order値を取得
  const maxOrder = await prisma.article.aggregate({
    where: {
      tailId,
      parentId: data.parentId || null,
    },
    _max: {
      order: true,
    },
  });
  
  return prisma.article.create({
    data: {
      tailId,
      title: data.title,
      content: data.content,
      parentId: data.parentId,
      isFolder: data.isFolder || false,
      path,
      level,
      order: (maxOrder._max.order || 0) + 1,
    },
  });
}

// 記事の移動（親変更）
export async function moveArticle(articleId: string, newParentId: string | null) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });
  
  if (!article) {
    throw new Error('記事が見つかりません');
  }
  
  // 循環参照チェック
  if (newParentId) {
    await validateNoCircularReference(articleId, newParentId);
    
    // 新しい親の階層レベルチェック
    const newParent = await prisma.article.findUnique({
      where: { id: newParentId },
    });
    
    if (!newParent) {
      throw new Error('移動先の親記事が見つかりません');
    }
    
    if (newParent.level >= 4) {
      throw new Error('階層は5階層までです');
    }
  }
  
  // 記事を移動
  return prisma.article.update({
    where: { id: articleId },
    data: {
      parentId: newParentId,
      level: newParentId ? await getNewLevel(newParentId) : 0,
    },
  });
}

// 循環参照チェック
async function validateNoCircularReference(articleId: string, newParentId: string): Promise<void> {
  let currentParentId: string | null = newParentId;
  
  while (currentParentId) {
    if (currentParentId === articleId) {
      throw new Error('循環参照が発生します');
    }
    
    const parent = await prisma.article.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    
    currentParentId = parent?.parentId || null;
  }
}

// 新しい階層レベルを計算
async function getNewLevel(parentId: string): Promise<number> {
  const parent = await prisma.article.findUnique({
    where: { id: parentId },
    select: { level: true },
  });
  
  return (parent?.level || 0) + 1;
}

// 記事削除（子記事の処理付き）
export async function deleteArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { children: true },
  });
  
  if (!article) {
    throw new Error('記事が見つかりません');
  }
  
  // 子記事を親の親に移動（1階層上げる）
  if (article.children.length > 0) {
    await prisma.article.updateMany({
      where: { parentId: articleId },
      data: {
        parentId: article.parentId,
        level: article.level,
      },
    });
  }
  
  // 記事を削除
  return prisma.article.delete({
    where: { id: articleId },
  });
}

// 記事ツリー取得
export async function getArticleTree(tailId: string): Promise<ArticleTreeNode[]> {
  const articles = await prisma.article.findMany({
    where: { tailId },
    orderBy: [
      { level: 'asc' },
      { order: 'asc' },
    ],
  });
  
  return buildTree(articles);
}

interface ArticleTreeNode extends Article {
  children: ArticleTreeNode[];
}

function buildTree(articles: Article[]): ArticleTreeNode[] {
  const map = new Map<string, ArticleTreeNode>();
  const roots: ArticleTreeNode[] = [];
  
  // まず全ての記事をマップに入れる
  articles.forEach(article => {
    map.set(article.id, { ...article, children: [] });
  });
  
  // 親子関係を構築
  articles.forEach(article => {
    const node = map.get(article.id)!;
    
    if (article.parentId) {
      const parent = map.get(article.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}

// パンくずリスト生成
export async function getBreadcrumbs(articleId: string): Promise<Array<{ id: string; title: string; path: string }>> {
  const breadcrumbs: Array<{ id: string; title: string; path: string }> = [];
  let currentId: string | null = articleId;
  
  while (currentId) {
    const article = await prisma.article.findUnique({
      where: { id: currentId },
      select: { id: true, title: true, path: true, parentId: true },
    });
    
    if (!article) break;
    
    breadcrumbs.unshift({
      id: article.id,
      title: article.title,
      path: article.path,
    });
    
    currentId = article.parentId;
  }
  
  return breadcrumbs;
}

export default {
  createTail,
  getTailsByUser,
  getTail,
  updateTail,
  deleteTail,
  createArticle,
  moveArticle,
  deleteArticle,
  getArticleTree,
  getBreadcrumbs,
};