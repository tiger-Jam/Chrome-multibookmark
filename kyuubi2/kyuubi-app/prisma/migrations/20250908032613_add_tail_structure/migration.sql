/*
  Warnings:

  - You are about to drop the column `userId` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `collections` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `tags` table. All the data in the column will be lost.
  - Added the required column `path` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tailId` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tailId` to the `collections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tailId` to the `tags` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "tails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSyncAt" DATETIME,
    "fileModifiedAt" DATETIME,
    "dbModifiedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tailId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assets_tailId_fkey" FOREIGN KEY ("tailId") REFERENCES "tails" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tailId" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "articles_tailId_fkey" FOREIGN KEY ("tailId") REFERENCES "tails" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "articles_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "articles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_articles" ("content", "createdAt", "id", "isPublic", "slug", "title", "updatedAt", "wordCount") SELECT "content", "createdAt", "id", "isPublic", "slug", "title", "updatedAt", "wordCount" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
CREATE INDEX "articles_tailId_parentId_idx" ON "articles"("tailId", "parentId");
CREATE INDEX "articles_tailId_path_idx" ON "articles"("tailId", "path");
CREATE INDEX "articles_tailId_level_order_idx" ON "articles"("tailId", "level", "order");
CREATE UNIQUE INDEX "articles_tailId_path_key" ON "articles"("tailId", "path");
CREATE TABLE "new_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tailId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "collections_tailId_fkey" FOREIGN KEY ("tailId") REFERENCES "tails" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_collections" ("createdAt", "description", "id", "name", "updatedAt") SELECT "createdAt", "description", "id", "name", "updatedAt" FROM "collections";
DROP TABLE "collections";
ALTER TABLE "new_collections" RENAME TO "collections";
CREATE INDEX "collections_tailId_idx" ON "collections"("tailId");
CREATE UNIQUE INDEX "collections_tailId_name_key" ON "collections"("tailId", "name");
CREATE TABLE "new_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tailId" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_tailId_fkey" FOREIGN KEY ("tailId") REFERENCES "tails" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tags" ("color", "createdAt", "id", "name") SELECT "color", "createdAt", "id", "name" FROM "tags";
DROP TABLE "tags";
ALTER TABLE "new_tags" RENAME TO "tags";
CREATE INDEX "tags_tailId_idx" ON "tags"("tailId");
CREATE UNIQUE INDEX "tags_tailId_name_key" ON "tags"("tailId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "tails_userId_idx" ON "tails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tails_userId_name_key" ON "tails"("userId", "name");

-- CreateIndex
CREATE INDEX "assets_tailId_idx" ON "assets"("tailId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tailId_filePath_key" ON "assets"("tailId", "filePath");
