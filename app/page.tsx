import { ClientOnlySite } from "@/components/ClientOnlySite";
import { getPortfolioData } from "@/server/services/content.service";
import { data as fallbackData } from "@/src/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data = fallbackData as any;
  try {
    const fromDb = await getPortfolioData();
    if (fromDb.head?.name) data = fromDb;
  } catch {
    // database not reachable / not yet migrated -> fall back to data.js
  }

  return <ClientOnlySite data={data} />;
}
