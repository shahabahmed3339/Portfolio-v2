import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { interestSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "interest",
  delegate: () => prisma.interest as any,
  createSchema: interestSchema,
  updateSchema: interestSchema.partial(),
});

export { GET, PUT, DELETE };
