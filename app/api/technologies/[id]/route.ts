import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { technologySchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "technology",
  delegate: () => prisma.technology as any,
  createSchema: technologySchema,
  updateSchema: technologySchema.partial(),
});

export { GET, PUT, DELETE };
