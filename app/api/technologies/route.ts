import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { technologySchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "technology",
  delegate: () => prisma.technology as any,
  createSchema: technologySchema,
  updateSchema: technologySchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
