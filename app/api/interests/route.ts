import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { interestSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "interest",
  delegate: () => prisma.interest as any,
  createSchema: interestSchema,
  updateSchema: interestSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
