import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { projectSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "project",
  delegate: () => prisma.project as any,
  createSchema: projectSchema,
  updateSchema: projectSchema.partial(),
});

export { GET, PUT, DELETE };
