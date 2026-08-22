-- CreateEnum
CREATE TYPE "CatStatus" AS ENUM ('PENDING', 'LIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "Moderation" AS ENUM ('OK', 'REVIEW', 'REJECT');

-- CreateTable
CREATE TABLE "Cat" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "ownerHandle" TEXT,
    "linkUrl" TEXT,
    "country" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "firstBidAt" TIMESTAMP(3),
    "status" "CatStatus" NOT NULL DEFAULT 'PENDING',
    "moderation" "Moderation",
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "resultingCents" INTEGER NOT NULL,
    "providerRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "eventId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cat_slug_key" ON "Cat"("slug");

-- CreateIndex
CREATE INDEX "Cat_status_amountCents_firstBidAt_idx" ON "Cat"("status", "amountCents" DESC, "firstBidAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Bid_providerRef_key" ON "Bid"("providerRef");

-- CreateIndex
CREATE INDEX "Bid_catId_createdAt_idx" ON "Bid"("catId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Bid_createdAt_idx" ON "Bid"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_catId_idx" ON "Report"("catId");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
