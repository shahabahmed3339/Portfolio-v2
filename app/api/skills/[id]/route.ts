import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { skillSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "skill",
  delegate: () => prisma.skill as any,
  createSchema: skillSchema,
  updateSchema: skillSchema.partial(),
});

export { GET, PUT, DELETE };
