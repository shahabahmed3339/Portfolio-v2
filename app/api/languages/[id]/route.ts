import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { languageSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "language",
  delegate: () => prisma.language as any,
  createSchema: languageSchema,
  updateSchema: languageSchema.partial(),
});

export { GET, PUT, DELETE };
