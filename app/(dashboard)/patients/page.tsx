import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/auth";
import { getOverduePatientsPage } from "@/lib/queries/patients";
import SectionLabel from "@/components/ui-kit/SectionLabel";
import LayeredCard from "@/components/ui-kit/LayeredCard";
import PatientDrawer from "@/components/PatientDrawer";
import PatientFilters from "@/components/patients/PatientFilter";
import Pagination from "@/components/patients/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchParams = Promise<{
  condition?: string;
  status?: string;
  search?: string;
  page?: string;
}>;

const PAGE_SIZE = 25;

const STATUS_STYLE: Record<string, string> = {
  RED: "bg-danger-bg text-danger",
  AMBER: "bg-warning-bg text-warning",
  GREEN: "bg-ok-bg text-ok",
};

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters = {
    condition: sp.condition,
    status: sp.status,
    search: sp.search,
  };

  const { rows, total, summary } = await getOverduePatientsPage(
    session.user.clinicId,
    filters,
    page,
    PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <SectionLabel
        eyebrow="Patient Roster"
        title="Follow-up tracking"
        level={2}
      />

      {/* Summary pills reflect the whole filtered set, not just this page. */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Red overdue" value={summary.red} />
        <StatPill label="Amber" value={summary.amber} />
        <StatPill label="Never visited" value={summary.never} />
      </div>

      {/* Live, URL-synced filter bar (client). */}
      <PatientFilters />

      <LayeredCard grain={false} className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="text-ink-3">Name</TableHead>
              <TableHead className="text-ink-3">Conditions</TableHead>
              <TableHead className="text-ink-3">Last Visit</TableHead>
              <TableHead className="text-ink-3">Days Since</TableHead>
              <TableHead className="text-ink-3">Status</TableHead>
              <TableHead className="text-right text-ink-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="border-line">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-ink-3"
                >
                  No patients match these filters.
                </TableCell>
              </TableRow>
            )}

            {rows.map((p) => (
              <TableRow key={p.id} className="border-line">
                <TableCell className="font-medium text-ink">{p.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.icd10Codes.length === 0 ? (
                      <span className="text-xs text-ink-3">—</span>
                    ) : (
                      p.icd10Codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-sm bg-brand-muted px-1.5 py-0.5 text-[11px] font-medium text-brand-dk"
                        >
                          {code}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-ink-2">
                  {p.lastVisitDate
                    ? format(p.lastVisitDate, "dd MMM yyyy")
                    : "Never"}
                </TableCell>
                <TableCell className="text-ink-2">
                  {p.daysSinceLastVisit === 999 ? "—" : p.daysSinceLastVisit}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[p.overdueStatus]}`}
                  >
                    {p.overdueStatus}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <PatientDrawer patientId={p.id} patientName={p.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </LayeredCard>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-sm bg-brand-muted px-3 py-1 text-sm text-brand-dk">
      <span className="font-semibold">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-eyebrow">
        {label}
      </span>
    </span>
  );
}
