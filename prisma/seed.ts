import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { data } from "../src/data.js";

const toArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@portfolio.local").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Portfolio Admin";

async function main() {
  // --- Admin user -----------------------------------------------------------
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash, role: "ADMIN" },
  });
  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);

  // --- Profile --------------------------------------------------------------
  const existing = await prisma.profile.findFirst();
  const profileData = {
    name: data.head.name,
    title: data.head.title,
    totalExperience: data.head.totalExperience,
    profile: data.head.profile,
    location: data.head.location,
    phone: data.head.phone,
    email: data.head.email,
    linkedIn: data.head.linkedIn,
    github: data.head.github,
    portfolio: data.head.portfolio,
    backgroundVideo: data.backgroundVideo,
    resume: data.resume,
  };
  const profile = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data: profileData })
    : await prisma.profile.create({ data: profileData });

  // Reset child collections for an idempotent seed.
  await prisma.socialLink.deleteMany({ where: { profileId: profile.id } });
  await prisma.aboutParagraph.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.education.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.technology.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.interest.deleteMany({});
  await prisma.language.deleteMany({});

  await prisma.socialLink.createMany({
    data: data.head.links.map((l: any, i: number) => ({
      profileId: profile.id,
      title: l.title,
      url: l.url,
      icon: l.icon,
      sortOrder: i,
    })),
  });

  await prisma.aboutParagraph.createMany({
    data: data.about.map((text: string, i: number) => ({ text, sortOrder: i })),
  });

  await prisma.experience.createMany({
    data: data.experience.map((e: any, i: number) => ({
      image: e.image,
      title: e.title,
      company: e.company,
      description: e.description,
      location: e.location,
      start: e.start,
      end: e.end,
      accomplishments: toArray(e.accomplishments),
      sortOrder: i,
    })),
  });

  await prisma.education.createMany({
    data: data.education.map((e: any, i: number) => ({
      image: e.image,
      title: e.title,
      institute: e.institute,
      location: e.location,
      start: e.start,
      end: e.end,
      cgpa: e.cgpa,
      thesis: e.thesis,
      sortOrder: i,
    })),
  });

  await prisma.project.createMany({
    data: data.projects.map((p: any, i: number) => ({
      title: p.title,
      description: p.description,
      techList: toArray(p.techList),
      github: p.github,
      liveUrl: p.liveUrl,
      sortOrder: i,
    })),
  });

  await prisma.technology.createMany({
    data: data.technologies.map((t: any, i: number) => ({
      title: t.title,
      icon: t.icon ?? null,
      category: t.category ?? "Other",
      sortOrder: i,
    })),
  });

  await prisma.skill.createMany({
    data: data.skills.map((title: string, i: number) => ({ title, sortOrder: i })),
  });

  const interests: string[] = (data as any).interests ?? [];
  await prisma.interest.createMany({
    data: interests.map((title: string, i: number) => ({ title, sortOrder: i })),
  });

  await prisma.language.createMany({
    data: data.languages.map((entry: string, i: number) => {
      const [name, proficiency] = entry.split(" - ");
      return { name: name.trim(), proficiency: proficiency?.trim() ?? null, sortOrder: i };
    }),
  });

  console.log("Seeded portfolio content from src/data.js");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
