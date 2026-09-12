import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { projectSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "project",
  delegate: () => prisma.project as any,
  createSchema: projectSchema,
  updateSchema: projectSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
