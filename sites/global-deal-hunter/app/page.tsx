import DealDashboard from "@/components/deal-dashboard";
import { loadDashboard } from "@/lib/dashboard-store";

export const revalidate = 600;

export default async function Home() {
  const data = await loadDashboard();
  return <DealDashboard deals={data.deals} latestScan={data.latestScan} sourceHealth={data.sourceHealth} />;
}
