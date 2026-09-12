import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { experienceSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "experience",
  delegate: () => prisma.experience as any,
  createSchema: experienceSchema,
  updateSchema: experienceSchema.partial(),
});

export { GET, PUT, DELETE };
