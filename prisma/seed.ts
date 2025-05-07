// prisma/seed.ts
import { PrismaClient, AdminRole, College } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roundsOfHashing = 10;

async function main() {
  console.log(`Start seeding ...`);

  // === Seed Admins ===
  const passwordSuperAdmin = await bcrypt.hash('select2025', roundsOfHashing);
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'sa.select25@gmail.com' },
    update: {
      email: 'sa.select25@gmail.com',
      password: passwordSuperAdmin,
    },
    create: {
      email: 'sa.select25@gmail.com',
      password: passwordSuperAdmin,
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log(`Created/updated super admin with email: ${superAdmin.email}`);

  const passwordAuditor = await bcrypt.hash('audit.select2025', roundsOfHashing);
  const auditor = await prisma.admin.upsert({
    where: { email: 'audit.select25@gmail.com' },
    update: {},
    create: {
      email: 'audit.select25@gmail.comh',
      password: passwordAuditor,
      role: AdminRole.AUDITOR,
    },
  });
  console.log(`Created/updated auditor with email: ${auditor.email}`);

  // Seed Moderators (one per college)
  const colleges = Object.values(College);
  for (const college of colleges) {
    const moderatorEmail = `${college.toLowerCase()}.mod.select25@gmail.com`;
    const passwordModerator = await bcrypt.hash(`${college.toLowerCase()}.modselect2025`, roundsOfHashing); // Simple predictable password for seeding
    const moderator = await prisma.admin.upsert({
      where: { email: moderatorEmail },
      update: {},
      create: {
        email: moderatorEmail,
        password: passwordModerator,
        role: AdminRole.MODERATOR,
        college: college, // Assign college to moderator
      },
    });
    console.log(`Created/updated ${college} moderator with email: ${moderator.email}`);
  }

  await prisma.student.upsert({
    where: { email: 'juan.delacruz@wvsu.edu.ph' },
    update: { // If email exists, ensure it's marked as pre-approved
      isPreApproved: true,
      college: College.CICT,
      // You can update other fields if necessary on subsequent seeds
    },
    create: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan.delacruz@wvsu.edu.ph',
      college: College.CICT,
      isPreApproved: true, // Explicitly set
      // password field is omitted, so it remains null
    },
  });
  console.log(`Seeded/updated pre-approved student: juan.delacruz@wvsu.edu.ph`);

  await prisma.student.upsert({
    where: { email: 'maria.santos@wvsu.edu.ph' },
    update: {
      isPreApproved: true,
      college: College.CON
    },
    create: {
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@wvsu.edu.ph',
      college: College.CON,
      isPreApproved: true,
    },
  });
  console.log(`Seeded/updated pre-approved student: maria.santos@wvsu.edu.ph`);

  await prisma.student.upsert({
    where: { email: 'ethanjed.carbonell@wvsu.edu.ph' },
    update: {},
    create: {
      firstName: 'Ethan Jed',
      lastName: 'Carbonell',
      email: 'ethanjed.carbonell@wvsu.edu.ph',
      college: College.CICT,
      isPreApproved: true,
    },
  });
  console.log(`Seeded/updated pre-approved student: ethanjed.carbonell@wvsu.edu.ph`);

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });