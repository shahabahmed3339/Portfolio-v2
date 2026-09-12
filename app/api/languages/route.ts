import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { languageSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "language",
  delegate: () => prisma.language as any,
  createSchema: languageSchema,
  updateSchema: languageSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
});

export { GET, POST };
