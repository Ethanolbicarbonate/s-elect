// prisma/seed.ts
import { PrismaClient, AdminRole, College } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roundsOfHashing = 10;

async function main() {
  console.log(`Start seeding ...`);

  // === Seed Admins ===
  const passwordSuperAdmin = await bcrypt.hash('superadminpass', roundsOfHashing);
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@select.wvsu.edu.ph' },
    update: {},
    create: {
      email: 'superadmin@select.wvsu.edu.ph',
      password: passwordSuperAdmin,
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log(`Created/updated super admin with email: ${superAdmin.email}`);

  const passwordAuditor = await bcrypt.hash('auditorpass', roundsOfHashing);
  const auditor = await prisma.admin.upsert({
    where: { email: 'auditor@select.wvsu.edu.ph' },
    update: {},
    create: {
      email: 'auditor@select.wvsu.edu.ph',
      password: passwordAuditor,
      role: AdminRole.AUDITOR,
    },
  });
  console.log(`Created/updated auditor with email: ${auditor.email}`);

  // Seed Moderators (one per college)
  const colleges = Object.values(College);
  for (const college of colleges) {
    const moderatorEmail = `moderator.${college.toLowerCase()}@select.wvsu.edu.ph`;
    const passwordModerator = await bcrypt.hash(`${college.toLowerCase()}pass`, roundsOfHashing); // Simple predictable password for seeding
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

  // === Seed Students (Example) ===
  const passwordStudent1 = await bcrypt.hash('password123', roundsOfHashing);
  const student1 = await prisma.student.upsert({
      where: { email: 'juan.delacruz@wvsu.edu.ph'},
      update: {},
      create: {
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan.delacruz@wvsu.edu.ph',
          password: passwordStudent1,
          college: College.CICT,
      }
  });
   console.log(`Created/updated student with email: ${student1.email}`);

  const passwordStudent2 = await bcrypt.hash('password456', roundsOfHashing);
  const student2 = await prisma.student.upsert({
      where: { email: 'maria.santos@wvsu.edu.ph'},
      update: {},
      create: {
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria.santos@wvsu.edu.ph',
          password: passwordStudent2,
          college: College.CON,
      }
  });
  console.log(`Created/updated student with email: ${student2.email}`);

  // Add more students for different colleges...

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