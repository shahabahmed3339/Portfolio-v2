import { prisma } from "@/server/db/client";
import { makeItemHandlers } from "@/server/api/crud";
import { aboutSchema } from "@/server/api/schemas";

const { GET, PUT, DELETE } = makeItemHandlers({
  name: "about",
  delegate: () => prisma.aboutParagraph as any,
  createSchema: aboutSchema,
  updateSchema: aboutSchema.partial(),
});

export { GET, PUT, DELETE };
