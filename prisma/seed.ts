// Demo data: `npx prisma db seed` (CLI). Wipes and re-creates demo entities.
// The dataset itself lives in src/server/seed-demo.ts, shared with the
// first-boot auto-seed (src/instrumentation.ts).
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemoData } from "../src/server/seed-demo";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("Seeding PINFABB Manager demo data…");

  // Wipe in FK-safe order
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.aiJob.deleteMany(),
    prisma.signature.deleteMany(),
    prisma.report.deleteMany(),
    prisma.reportTemplate.deleteMany(),
    prisma.directive.deleteMany(),
    prisma.criticality.deleteMany(),
    prisma.transcript.deleteMany(),
    prisma.meetingRecording.deleteMany(),
    prisma.measurement.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.dailyLog.deleteMany(),
    prisma.measurementStandard.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.project.deleteMany(),
    prisma.location.deleteMany(),
    prisma.vessel.deleteMany(),
    prisma.client.deleteMany(),
    prisma.availability.deleteMany(),
    prisma.technicianSkill.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.technician.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await seedDemoData(prisma);

  console.log("\nSeed complete. Demo accounts:");
  console.log("  ADMIN       admin@pinfabb.it      / Admin123!");
  console.log("  MANAGER     manager@pinfabb.it    / Manager123!");
  console.log("  TECHNICIAN  marco.rossi@pinfabb.it    / Tech123!");
  console.log("  TECHNICIAN  luca.bianchi@pinfabb.it   / Tech123!");
  console.log("  TECHNICIAN  andrei.popescu@pinfabb.it / Tech123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
