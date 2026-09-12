import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { skillSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "skill",
  delegate: () => prisma.skill as any,
  createSchema: skillSchema,
  updateSchema: skillSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
