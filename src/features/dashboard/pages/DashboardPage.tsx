import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, BookOpenCheck, HandCoins, HeartHandshake, Landmark, Receipt, Users, WalletCards } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SummaryCards } from "@/components/ui/SummaryCards";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppSelector } from "@/hooks/redux";
import {
  collectionSelectors,
  commitmentSelectors,
  paymentSelectors,
  selectDashboardKpis,
  selectExecutiveBalances,
} from "@/store/selectors";
import { formatCurrency } from "@/utils/currency";

const palette = ["#047857", "#0369a1", "#b45309", "#7c3aed", "#be123c"];

export default function DashboardPage() {
  const kpis = useAppSelector(selectDashboardKpis);
  const collections = useAppSelector(collectionSelectors.selectAll);
  const payments = useAppSelector(paymentSelectors.selectAll);
  const commitments = useAppSelector(commitmentSelectors.selectAll);
  const executiveBalances = useAppSelector(selectExecutiveBalances);

  const monthlyCollections = useMemo(
    () =>
      collections.slice(0, 80).reduce<{ month: string; amount: number }[]>((rows, collection) => {
        const month = new Date(collection.date).toLocaleString("en", { month: "short" });
        const existing = rows.find((row) => row.month === month);
        if (existing) existing.amount += collection.amount.convertedAmount;
        else rows.push({ month, amount: collection.amount.convertedAmount });
        return rows;
      }, []),
    [collections],
  );

  const byCurrency = useMemo(
    () => ["KWD", "INR"].map((currency) => ({
      name: currency,
      value: collections.filter((item) => item.amount.currency === currency).length,
    })),
    [collections],
  );

  return (
    <div className="space-y-4">
      <SummaryCards
        items={[
          { label: "Total Collections", value: formatCurrency(kpis.totalCollections, "INR"), detail: "Consolidated INR", icon: HandCoins },
          { label: "Total Disbursements", value: formatCurrency(kpis.totalDisbursements, "INR"), detail: "Approved and paid", icon: Banknote },
          { label: "Funds with Executives", value: formatCurrency(kpis.fundsWithExecutives, "INR"), detail: "Cash handling exposure", icon: WalletCards },
          { label: "Bank Balances", value: formatCurrency(kpis.bankBalances, "INR"), detail: "Across active accounts", icon: Landmark },
          { label: "Funds with Treasurer", value: formatCurrency(kpis.fundsWithTreasurer, "INR"), detail: "Awaiting deposit", icon: Receipt },
          { label: "Active Beneficiaries", value: String(kpis.activeBeneficiaries), detail: "Open cases", icon: HeartHandshake },
          { label: "Active Commitments", value: String(kpis.activeCommitments), detail: "Future liability", icon: BookOpenCheck },
          { label: "Pending Contributions", value: String(kpis.pendingContributions), detail: "Pledged not received", icon: Users },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Monthly Collections" />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCollections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#047857" fill="#a7f3d0" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Collections by Currency" />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCurrency} dataKey="value" nameKey="name" outerRadius={95} label>
                  {byCurrency.map((entry, index) => <Cell key={entry.name} fill={palette[index]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Executive Balances" />
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={executiveBalances}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="balance" fill="#0369a1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent Payments" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.slice(0, 6).map((payment) => (
              <div className="flex items-center justify-between px-4 py-3" key={payment.id}>
                <div>
                  <p className="text-sm font-medium">{payment.voucherNumber}</p>
                  <p className="text-xs text-slate-500">{payment.category}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Pending Commitments" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {commitments.slice(0, 6).map((commitment) => (
              <div className="px-4 py-3" key={commitment.id}>
                <p className="text-sm font-medium">{commitment.category}</p>
                <p className="text-xs text-slate-500">Outstanding {formatCurrency(commitment.remainingBalance, "INR")}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
