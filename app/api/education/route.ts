import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { educationSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "education",
  delegate: () => prisma.education as any,
  createSchema: educationSchema,
  updateSchema: educationSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
});

export { GET, POST };
