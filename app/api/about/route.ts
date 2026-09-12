import { prisma } from "@/server/db/client";
import { makeCollectionHandlers } from "@/server/api/crud";
import { aboutSchema } from "@/server/api/schemas";

const { GET, POST } = makeCollectionHandlers({
  name: "about",
  delegate: () => prisma.aboutParagraph as any,
  createSchema: aboutSchema,
  updateSchema: aboutSchema.partial(),
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
});

export { GET, POST };
