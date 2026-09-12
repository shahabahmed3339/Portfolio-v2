import { z } from "zod";

const sortOrder = z.coerce.number().int().optional();
// Accepts an array or a newline string (from the admin textarea) -> string[].
const stringList = z.union([z.array(z.string()), z.string()]).transform((value) =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
);

export const experienceSchema = z.object({
  image: z.string().nullable().optional(),
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start: z.string().min(1),
  end: z.string().nullable().optional(),
  accomplishments: stringList.optional(),
  sortOrder,
});

export const educationSchema = z.object({
  image: z.string().nullable().optional(),
  title: z.string().min(1),
  institute: z.string().min(1),
  location: z.string().nullable().optional(),
  start: z.string().min(1),
  end: z.string().nullable().optional(),
  cgpa: z.string().nullable().optional(),
  thesis: z.string().nullable().optional(),
  sortOrder,
});

export const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  techList: stringList.optional(),
  github: z.string().nullable().optional(),
  liveUrl: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  sortOrder,
});

export const technologySchema = z.object({
  title: z.string().min(1),
  icon: z.string().nullable().optional(),
  category: z.string().default("Other"),
  sortOrder,
});

export const skillSchema = z.object({ title: z.string().min(1), sortOrder });
export const interestSchema = z.object({ title: z.string().min(1), sortOrder });
export const aboutSchema = z.object({ text: z.string().min(1), sortOrder });
export const socialLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  icon: z.string().nullable().optional(),
  sortOrder,
});
export const languageSchema = z.object({
  name: z.string().min(1),
  proficiency: z.string().nullable().optional(),
  sortOrder,
});
