import { prisma } from "@/server/db/client";
import { toRootRelativeAsset } from "@/server/assets/asset-path";
import { getActiveResume } from "@/server/services/resume.service";

/** Ensure a singleton Profile row exists and return it. */
export async function ensureProfile() {
  const existing = await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.profile.create({
    data: { name: "Your Name", title: "Your Title", totalExperience: 0 },
  });
}

export interface PortfolioData {
  backgroundVideo: string;
  resume: string;
  head: {
    name: string;
    title: string;
    totalExperience: number;
    profile: string;
    location: string;
    phone: string;
    email: string;
    linkedIn: string;
    github: string;
    portfolio: string;
    links: { title: string; url: string; icon: string }[];
  };
  about: string[];
  experience: any[];
  education: any[];
  projects: any[];
  technologies: any[];
  skills: string[];
  interests: string[];
  languages: string[];
}

/** Reads the whole portfolio out of the DB in the exact shape the site expects. */
export async function getPortfolioData(): Promise<PortfolioData> {
  const content = await readContentFromDb();

  // Resume resolution is layered on top of the existing content read. When no
  // tailored resume has been explicitly published this returns the canonical
  // resume from src/data.js, so the portfolio behaves exactly as before.
  try {
    const { resume } = await getActiveResume();
    return {
      ...content,
      resume: content.resume || resume.resume,
      head: { ...content.head, links: resume.head.links.length ? resume.head.links : content.head.links },
      about: resume.about,
      experience: resume.experience,
      education: resume.education,
      projects: resume.projects,
      technologies: resume.technologies,
      skills: resume.skills,
      interests: resume.interests,
      languages: resume.languages,
    };
  } catch (error) {
    // Never let resume resolution break the portfolio.
    console.error("[portfolio] resume overlay failed; serving database content as-is.", error);
    return content;
  }
}

/** Reads the portfolio content tables exactly as before this feature was added. */
async function readContentFromDb(): Promise<PortfolioData> {
  const profile = await ensureProfile();

  const [links, about, experience, education, projects, technologies, skills, interests, languages] =
    await Promise.all([
      prisma.socialLink.findMany({ where: { profileId: profile.id }, orderBy: [{ sortOrder: "asc" }] }),
      prisma.aboutParagraph.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.experience.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.education.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.project.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }] }),
      prisma.technology.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.skill.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.interest.findMany({ orderBy: [{ sortOrder: "asc" }] }),
      prisma.language.findMany({ orderBy: [{ sortOrder: "asc" }] }),
    ]);

  return {
    backgroundVideo: toRootRelativeAsset(profile.backgroundVideo) ?? "",
    resume: toRootRelativeAsset(profile.resume) ?? "",
    head: {
      name: profile.name,
      title: profile.title,
      totalExperience: profile.totalExperience,
      profile: toRootRelativeAsset(profile.profile) ?? "",
      location: profile.location ?? "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
      linkedIn: profile.linkedIn ?? "",
      github: profile.github ?? "",
      portfolio: profile.portfolio ?? "",
      links: links.map((l) => ({
        title: l.title,
        url: l.url,
        icon: toRootRelativeAsset(l.icon) ?? "",
      })),
    },
    about: about.map((a) => a.text),
    experience: experience.map((e) => ({
      image: toRootRelativeAsset(e.image) ?? undefined,
      title: e.title,
      company: e.company,
      description: e.description,
      location: e.location,
      start: e.start,
      end: e.end,
      accomplishments: e.accomplishments,
    })),
    education: education.map((e) => ({
      image: toRootRelativeAsset(e.image) ?? undefined,
      title: e.title,
      institute: e.institute,
      location: e.location,
      start: e.start,
      end: e.end,
      cgpa: e.cgpa,
      thesis: e.thesis,
    })),
    projects: projects.map((p) => ({
      title: p.title,
      description: p.description,
      techList: p.techList,
      github: p.github,
      liveUrl: p.liveUrl,
    })),
    technologies: technologies.map((t) => ({
      title: t.title,
      icon: toRootRelativeAsset(t.icon),
      category: t.category,
    })),
    skills: skills.map((s) => s.title),
    interests: interests.map((i) => i.title),
    languages: languages.map((l) => (l.proficiency ? `${l.name} - ${l.proficiency}` : l.name)),
  };
}
