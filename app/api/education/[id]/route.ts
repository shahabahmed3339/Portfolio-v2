import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { educationSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "education",
  delegate: () => prisma.education as any,
  createSchema: educationSchema,
  updateSchema: educationSchema.partial(),
});

export { GET, PUT, DELETE };
