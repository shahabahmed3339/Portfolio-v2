import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { experienceSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "experience",
  delegate: () => prisma.experience as any,
  createSchema: experienceSchema,
  updateSchema: experienceSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
