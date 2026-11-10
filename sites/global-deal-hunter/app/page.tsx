import DealDashboard from "@/components/deal-dashboard";
import { loadDashboard } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await loadDashboard();
  return <DealDashboard deals={data.deals} latestScan={data.latestScan} />;
}
