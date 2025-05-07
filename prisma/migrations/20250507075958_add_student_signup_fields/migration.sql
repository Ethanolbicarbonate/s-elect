-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "isPreApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "verificationExpires" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT;
