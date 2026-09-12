import { NextResponse } from "next/server";
import type { ZodTypeAny } from "zod";
import { requireSession, recordAudit } from "@/server/auth/guard";

type Delegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

interface CrudConfig {
  name: string;
  delegate: () => Delegate;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  orderBy?: Record<string, "asc" | "desc">[];
}

/** Builds the GET/POST handlers for a collection. */
export function makeCollectionHandlers(config: CrudConfig) {
  const { name, delegate, createSchema, orderBy } = config;

  async function GET() {
    const items = await delegate().findMany(orderBy ? { orderBy } : undefined);
    return NextResponse.json(items);
  }

  async function POST(req: Request) {
    const guard = await requireSession();
    if ("response" in guard) return guard.response;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const created = await delegate().create({ data: parsed.data });
    await recordAudit(`CREATE_${name.toUpperCase()}`, `${name}:${created.id}`, undefined, guard.session.user.id);
    return NextResponse.json(created, { status: 201 });
  }

  return { GET, POST };
}

/** Builds the GET/PUT/DELETE handlers for a single item. */
export function makeItemHandlers(config: CrudConfig) {
  const { name, delegate, updateSchema } = config;

  async function GET(_req: Request, { params }: { params: { id: string } }) {
    const item = await delegate().findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: `${name} not found` }, { status: 404 });
    return NextResponse.json(item);
  }

  async function PUT(req: Request, { params }: { params: { id: string } }) {
    const guard = await requireSession();
    if ("response" in guard) return guard.response;

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const exists = await delegate().findUnique({ where: { id: params.id } });
    if (!exists) return NextResponse.json({ error: `${name} not found` }, { status: 404 });

    const updated = await delegate().update({ where: { id: params.id }, data: parsed.data });
    await recordAudit(`UPDATE_${name.toUpperCase()}`, `${name}:${params.id}`, undefined, guard.session.user.id);
    return NextResponse.json(updated);
  }

  async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const guard = await requireSession();
    if ("response" in guard) return guard.response;

    const exists = await delegate().findUnique({ where: { id: params.id } });
    if (!exists) return NextResponse.json({ error: `${name} not found` }, { status: 404 });

    await delegate().delete({ where: { id: params.id } });
    await recordAudit(`DELETE_${name.toUpperCase()}`, `${name}:${params.id}`, undefined, guard.session.user.id);
    return NextResponse.json({ ok: true });
  }

  return { GET, PUT, DELETE };
}
