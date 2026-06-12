// Demo dataset shared by `prisma db seed` (CLI) and the first-boot
// auto-seed in src/instrumentation.ts. Does NOT wipe existing data.
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

const day = (offset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

/** Seeds demo accounts and data only if the database has no users. */
export async function seedDemoIfEmpty(prisma: PrismaClient) {
  const users = await prisma.user.count();
  if (users > 0) {
    await fixLegacyNaming(prisma);
    return false;
  }
  console.log("[bootstrap] empty database — loading demo data…");
  await seedDemoData(prisma);
  console.log(
    "[bootstrap] demo data ready. Login: manager@pinfabb.it / Manager123! · marco.rossi@pinfabb.it / Tech123!",
  );
  return true;
}

/**
 * One-time data fix for databases seeded before the PINFAB→PINFABB rename
 * (company name has two Bs). Idempotent: matches only the old spelling.
 */
async function fixLegacyNaming(prisma: PrismaClient) {
  const [users, templates, names] = await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "User" SET email = replace(email, '@pinfab.it', '@pinfabb.it')
      WHERE email LIKE '%@pinfab.it'`,
    prisma.$executeRaw`
      UPDATE "ReportTemplate" SET name = replace(name, 'PINFAB ', 'PINFABB ')
      WHERE name LIKE 'PINFAB %'`,
    prisma.$executeRaw`
      UPDATE "User" SET name = replace(name, 'PINFAB', 'PINFABB')
      WHERE name LIKE '%PINFAB' OR name LIKE '%PINFAB %'`,
  ]);
  if (users > 0 || templates > 0 || names > 0) {
    console.log(
      `[bootstrap] renamed legacy PINFAB data (emails: ${users}, templates: ${templates}, names: ${names}) — login domain is now @pinfabb.it`,
    );
  }
}

export async function seedDemoData(prisma: PrismaClient) {
  const hash = (password: string) => bcrypt.hashSync(password, 10);

  // ── Users ──
  await prisma.user.create({
    data: {
      email: "admin@pinfabb.it",
      passwordHash: hash("Admin123!"),
      name: "Amministratore PINFABB",
      role: "ADMIN",
      locale: "it",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@pinfabb.it",
      passwordHash: hash("Manager123!"),
      name: "Giacomo Quaresima",
      role: "MANAGER",
      locale: "it",
    },
  });

  const technicianSpecs = [
    {
      email: "marco.rossi@pinfabb.it",
      name: "Marco Rossi",
      homeBase: "Genova, Italy",
      phone: "+39 333 1234567",
    },
    {
      email: "luca.bianchi@pinfabb.it",
      name: "Luca Bianchi",
      homeBase: "La Spezia, Italy",
      phone: "+39 333 7654321",
    },
    {
      email: "andrei.popescu@pinfabb.it",
      name: "Andrei Popescu",
      homeBase: "Constanța, Romania",
      phone: "+40 722 123456",
    },
  ];

  const technicians = [];
  for (const spec of technicianSpecs) {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash: hash("Tech123!"),
        name: spec.name,
        role: "TECHNICIAN",
        locale: "en",
        technician: {
          create: { homeBase: spec.homeBase, phone: spec.phone },
        },
      },
      include: { technician: true },
    });
    technicians.push(user.technician!);
  }
  const [tMarco, tLuca, tAndrei] = technicians;

  // ── Skills ──
  const skillNames = [
    "Hydraulics",
    "Mechanical fitting",
    "Electrical & controls",
    "Sea trial commissioning",
    "Welding supervision",
  ];
  const skills = await Promise.all(
    skillNames.map((name) => prisma.skill.create({ data: { name } })),
  );
  await prisma.technicianSkill.createMany({
    data: [
      { technicianId: tMarco.id, skillId: skills[0].id, level: 5 },
      { technicianId: tMarco.id, skillId: skills[1].id, level: 4 },
      { technicianId: tMarco.id, skillId: skills[3].id, level: 4 },
      { technicianId: tLuca.id, skillId: skills[1].id, level: 5 },
      { technicianId: tLuca.id, skillId: skills[4].id, level: 3 },
      { technicianId: tAndrei.id, skillId: skills[2].id, level: 5 },
      { technicianId: tAndrei.id, skillId: skills[0].id, level: 3 },
    ],
  });

  // ── Clients ──
  const [costaCrociere, msc, fincantieri] = await Promise.all([
    prisma.client.create({
      data: {
        name: "Costa Crociere",
        type: "SHIPOWNER",
        country: "Italy",
        contacts: [
          { name: "Paolo Ferraro", role: "Fleet Superintendent", email: "p.ferraro@example.com" },
        ],
      },
    }),
    prisma.client.create({
      data: {
        name: "MSC Cruises",
        type: "SHIPOWNER",
        country: "Switzerland",
        contacts: [
          { name: "Hans Weber", role: "Technical Manager", email: "h.weber@example.com" },
        ],
      },
    }),
    prisma.client.create({
      data: {
        name: "Fincantieri",
        type: "SHIPYARD",
        country: "Italy",
        contacts: [
          { name: "Sara Conti", role: "Project Engineer", email: "s.conti@example.com" },
        ],
      },
    }),
  ]);

  // ── Vessels ──
  const vessels = await Promise.all([
    prisma.vessel.create({
      data: {
        name: "Costa Smeralda",
        imoNumber: "9781889",
        vesselType: "Cruise ship",
        flag: "Italy",
        clientId: costaCrociere.id,
        stabilizerModel: "PF-S900 retractable",
        finCount: 4,
      },
    }),
    prisma.vessel.create({
      data: {
        name: "MSC Seaview",
        imoNumber: "9745390",
        vesselType: "Cruise ship",
        flag: "Malta",
        clientId: msc.id,
        stabilizerModel: "PF-S700 retractable",
        finCount: 2,
      },
    }),
    prisma.vessel.create({
      data: {
        name: "MSC World Europa",
        imoNumber: "9893170",
        vesselType: "Cruise ship",
        flag: "Malta",
        clientId: msc.id,
        stabilizerModel: "PF-S900 retractable",
        finCount: 4,
      },
    }),
    prisma.vessel.create({
      data: {
        name: "Costa Toscana",
        imoNumber: "9781891",
        vesselType: "Cruise ship",
        flag: "Italy",
        clientId: costaCrociere.id,
        stabilizerModel: "PF-S900 retractable",
        finCount: 4,
      },
    }),
    prisma.vessel.create({
      data: {
        name: "Hull C.6312",
        vesselType: "Newbuild cruise ship",
        flag: "Italy",
        clientId: fincantieri.id,
        stabilizerModel: "PF-S1000 retractable",
        finCount: 4,
      },
    }),
  ]);
  const [smeralda, seaview, worldEuropa, toscana, newbuild] = vessels;

  // ── Locations ──
  const [genova, marseille, rotterdam, singapore, dubai, lasPalmas] =
    await Promise.all([
      prisma.location.create({
        data: {
          name: "Ente Bacini Genova",
          kind: "DRYDOCK",
          city: "Genova",
          country: "Italy",
          lat: 44.4056,
          lng: 8.9463,
          timezone: "Europe/Rome",
        },
      }),
      prisma.location.create({
        data: {
          name: "Chantier Naval de Marseille",
          kind: "DRYDOCK",
          city: "Marseille",
          country: "France",
          lat: 43.3522,
          lng: 5.3328,
          timezone: "Europe/Paris",
        },
      }),
      prisma.location.create({
        data: {
          name: "Damen Verolme Rotterdam",
          kind: "SHIPYARD",
          city: "Rotterdam",
          country: "Netherlands",
          lat: 51.8869,
          lng: 4.3661,
          timezone: "Europe/Amsterdam",
        },
      }),
      prisma.location.create({
        data: {
          name: "Sembcorp Marine Tuas",
          kind: "SHIPYARD",
          city: "Singapore",
          country: "Singapore",
          lat: 1.2494,
          lng: 103.6325,
          timezone: "Asia/Singapore",
        },
      }),
      prisma.location.create({
        data: {
          name: "Drydocks World Dubai",
          kind: "DRYDOCK",
          city: "Dubai",
          country: "UAE",
          lat: 25.2582,
          lng: 55.2754,
          timezone: "Asia/Dubai",
        },
      }),
      prisma.location.create({
        data: {
          name: "Astican Las Palmas",
          kind: "SHIPYARD",
          city: "Las Palmas",
          country: "Spain",
          lat: 28.1396,
          lng: -15.4083,
          timezone: "Atlantic/Canary",
        },
      }),
    ]);

  // ── Global measurement standards ──
  await prisma.measurementStandard.createMany({
    data: [
      { type: "CLEARANCE", name: "Fin shaft radial clearance", unit: "mm", minValue: 0.1, maxValue: 0.3 },
      { type: "CLEARANCE", name: "Crux bearing axial clearance", unit: "mm", minValue: 0.05, maxValue: 0.2 },
      { type: "TOLERANCE", name: "Fin box alignment deviation", unit: "mm", minValue: 0, maxValue: 0.5 },
      { type: "PRESSURE", name: "Hydraulic system working pressure", unit: "bar", minValue: 180, maxValue: 210 },
      { type: "OIL_LEVEL", name: "Hydraulic tank oil level", unit: "%", minValue: 70, maxValue: 95 },
      { type: "TEMPERATURE", name: "Hydraulic oil temperature", unit: "°C", minValue: 25, maxValue: 60 },
      { type: "TORQUE", name: "Fin clamping bolts torque", unit: "Nm", minValue: 850, maxValue: 950 },
    ],
  });

  // ── Projects ──
  const inProgress = await prisma.project.create({
    data: {
      code: "PF-2026-014",
      title: "Costa Smeralda — 4-fin overhaul in dry dock",
      type: "DRYDOCK_WORKS",
      status: "IN_PROGRESS",
      complexity: 4,
      vesselId: smeralda.id,
      clientId: costaCrociere.id,
      locationId: genova.id,
      startDate: day(-6),
      endDate: day(6),
      actualStart: day(-6),
      description:
        "Full overhaul of 4 retractable fin units: seal replacement, bearing checks, hydraulic flushing and in-dock trials.",
      milestones: {
        create: [
          { name: "Fins dismounted", dueDate: day(-3), done: true },
          { name: "Seals replaced (all units)", dueDate: day(1) },
          { name: "Hull painting window", dueDate: day(4) },
          { name: "Undocking", dueDate: day(6) },
        ],
      },
    },
  });

  const singaporeJob = await prisma.project.create({
    data: {
      code: "PF-2026-015",
      title: "MSC Seaview — port fin seal renewal",
      type: "SERVICE",
      status: "IN_PROGRESS",
      complexity: 3,
      vesselId: seaview.id,
      clientId: msc.id,
      locationId: singapore.id,
      startDate: day(-2),
      endDate: day(9),
      actualStart: day(-2),
      description: "Port fin crux seal renewal and hydraulic oil change.",
      milestones: {
        create: [
          { name: "Fin locked & secured", dueDate: day(-1), done: true },
          { name: "Seal renewal complete", dueDate: day(5) },
          { name: "Function test", dueDate: day(8) },
        ],
      },
    },
  });

  const mobilizing = await prisma.project.create({
    data: {
      code: "PF-2026-016",
      title: "MSC World Europa — annual inspection",
      type: "INSPECTION",
      status: "MOBILIZING",
      complexity: 2,
      vesselId: worldEuropa.id,
      clientId: msc.id,
      locationId: marseille.id,
      startDate: day(3),
      endDate: day(8),
      description: "Annual class inspection of both fin stabilizer units.",
      milestones: {
        create: [{ name: "Class surveyor on board", dueDate: day(4) }],
      },
    },
  });

  const planned = await prisma.project.create({
    data: {
      code: "PF-2026-017",
      title: "Hull C.6312 — new installation, 4 fin units",
      type: "INSTALLATION",
      status: "PLANNED",
      complexity: 5,
      vesselId: newbuild.id,
      clientId: fincantieri.id,
      locationId: rotterdam.id,
      startDate: day(20),
      endDate: day(48),
      description:
        "Complete installation of 4 PF-S1000 units on newbuild: fin boxes, hydraulics, controls and commissioning.",
      milestones: {
        create: [
          { name: "Fin boxes welded", dueDate: day(28) },
          { name: "Hydraulics connected", dueDate: day(38) },
          { name: "Harbour test", dueDate: day(46) },
        ],
      },
    },
  });

  const onHold = await prisma.project.create({
    data: {
      code: "PF-2026-012",
      title: "Costa Toscana — starboard fin vibration investigation",
      type: "WARRANTY",
      status: "ON_HOLD",
      complexity: 4,
      vesselId: toscana.id,
      clientId: costaCrociere.id,
      locationId: dubai.id,
      startDate: day(-15),
      endDate: day(10),
      actualStart: day(-15),
      description:
        "Investigation of reported vibration on starboard fin at high speed. Awaiting spare bearing delivery.",
    },
  });

  await prisma.project.create({
    data: {
      code: "PF-2025-098",
      title: "Costa Smeralda — voyage repair, hydraulic leak",
      type: "SERVICE",
      status: "COMPLETED",
      complexity: 2,
      vesselId: smeralda.id,
      clientId: costaCrociere.id,
      locationId: lasPalmas.id,
      startDate: day(-60),
      endDate: day(-55),
      actualStart: day(-60),
      actualEnd: day(-56),
      description: "Voyage repair of hydraulic leak on port-aft fin unit.",
    },
  });

  // ── Assignments ──
  await prisma.assignment.createMany({
    data: [
      {
        projectId: inProgress.id,
        technicianId: tMarco.id,
        role: "LEAD",
        status: "ACTIVE",
        startDate: day(-6),
        endDate: day(6),
        travelOutDate: day(-7),
        travelReturnDate: day(7),
      },
      {
        projectId: inProgress.id,
        technicianId: tLuca.id,
        role: "TECHNICIAN",
        status: "ACTIVE",
        startDate: day(-6),
        endDate: day(6),
        travelOutDate: day(-7),
        travelReturnDate: day(7),
      },
      {
        projectId: singaporeJob.id,
        technicianId: tAndrei.id,
        role: "LEAD",
        status: "ACTIVE",
        startDate: day(-2),
        endDate: day(9),
        travelOutDate: day(-4),
        travelReturnDate: day(10),
      },
      {
        projectId: mobilizing.id,
        technicianId: tLuca.id,
        role: "LEAD",
        status: "CONFIRMED",
        startDate: day(3),
        endDate: day(8),
        travelOutDate: day(2),
        travelReturnDate: day(9),
      },
      {
        projectId: planned.id,
        technicianId: tMarco.id,
        role: "LEAD",
        status: "PLANNED",
        startDate: day(20),
        endDate: day(48),
      },
      {
        projectId: onHold.id,
        technicianId: tAndrei.id,
        role: "TECHNICIAN",
        status: "PLANNED",
        startDate: day(12),
        endDate: day(18),
      },
    ],
  });

  // ── Demo criticalities (MANUAL source; AI sources arrive with live data) ──
  await prisma.criticality.createMany({
    data: [
      {
        projectId: inProgress.id,
        severity: "HIGH",
        category: "SCHEDULE_CONFLICT",
        status: "OPEN",
        source: "MANUAL",
        title: "Hull painting overlaps fin reassembly window",
        description:
          "Yard moved hull painting to day 11 of 12. No work possible on fin units while painting: reassembly of unit 3-4 risks slipping past undocking.",
        recommendedAction:
          "Negotiate painting sequence with yard: aft sections first, fin areas last. Consider night shift for unit 4 reassembly.",
        technicianId: tMarco.id,
      },
      {
        projectId: singaporeJob.id,
        severity: "MEDIUM",
        category: "LEAK",
        status: "ACKNOWLEDGED",
        source: "MANUAL",
        title: "Minor oil seepage at port fin crux",
        description:
          "Seepage observed at crux flange before seal renewal. Consistent with worn seal; monitor until replacement is complete.",
        recommendedAction: "Document with photos before/after seal renewal.",
        finPosition: "PORT",
        technicianId: tAndrei.id,
      },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: "CRITICALITY",
      title: "Schedule conflict on PF-2026-014",
      body: "Hull painting overlaps fin reassembly window on Costa Smeralda.",
      link: "/manager/criticalities",
    },
  });

  // ── Default report template (replaced with the real PINFABB template when provided) ──
  await prisma.reportTemplate.create({
    data: {
      name: "PINFABB Service Report (default)",
      version: 1,
      isActive: true,
      structure: [
        { key: "cover", titleEn: "Cover", titleIt: "Copertina", kind: "text", aiHint: "Vessel name, project code, location, dates, attending technicians." },
        { key: "vessel_job_data", titleEn: "Vessel & Job Data", titleIt: "Dati Nave e Lavoro", kind: "table", aiHint: "Vessel particulars, stabilizer model, scope of work." },
        { key: "work_summary", titleEn: "Work Summary", titleIt: "Sintesi Lavori", kind: "text", aiHint: "Chronological summary of works performed, one paragraph per major activity." },
        { key: "daily_activity", titleEn: "Daily Activity Log", titleIt: "Registro Attività Giornaliere", kind: "text", aiHint: "Condensed day-by-day log from daily entries." },
        { key: "measurements", titleEn: "Measurements & Tolerances", titleIt: "Misurazioni e Tolleranze", kind: "measurements", aiHint: "" },
        { key: "findings", titleEn: "Findings & Anomalies", titleIt: "Riscontri e Anomalie", kind: "text", aiHint: "Out-of-spec measurements, damages, leaks, open points with recommendations." },
        { key: "photos", titleEn: "Photo Documentation", titleIt: "Documentazione Fotografica", kind: "photos", aiHint: "" },
        { key: "conclusions", titleEn: "Conclusions", titleIt: "Conclusioni", kind: "text", aiHint: "Final condition, residual risks, recommendations for next docking." },
        { key: "signatures", titleEn: "Signatures", titleIt: "Firme", kind: "signatures", aiHint: "" },
      ],
    },
  });
}
