"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getPatientDrawerData,
  markPatientContacted,
} from "@/app/(dashboard)/patients/actions";

type Appt = {
  id: string;
  appointmentDate: string | Date;
  appointmentType: string;
  status: string;
  billedCptCode: string | null;
  doctor: { name: string | null; email: string };
};
type History = {
  id: string;
  name: string;
  icd10Codes: string[];
  appointments: Appt[];
};
type FollowUp = {
  id: string;
  notes: string;
  actionDate: string | Date;
  pending?: boolean;
};

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-ok-bg text-ok",
  NO_SHOW: "bg-danger-bg text-danger",
  CANCELLED: "bg-warning-bg text-warning",
  SCHEDULED: "bg-brand-muted text-brand-dk",
};

export default function PatientDrawer({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [history, setHistory] = useState<History | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onOpenChange(open: boolean) {
    if (open && !history) {
      setLoading(true);
      try {
        const data = await getPatientDrawerData(patientId);
        setHistory(data.history as unknown as History);
        setFollowUps(data.followUps as unknown as FollowUp[]);
      } catch {
        toast.error("Couldn't load patient history.");
      } finally {
        setLoading(false);
      }
    }
  }

  // Optimistic WITH ROLLBACK: insert a temp row instantly, fire the action, and
  // on failure remove the temp row + error toast so the UI never lies about a
  // save that didn't happen.
  async function handleContacted() {
    const text = notes.trim();
    if (!text) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: FollowUp = {
      id: tempId,
      notes: text,
      actionDate: new Date(),
      pending: true,
    };

    setSaving(true);
    setFollowUps((prev) => [optimistic, ...prev]); // show immediately
    setNotes(""); // clear the box immediately

    try {
      await markPatientContacted(patientId, text);
      // Confirm: drop the pending flag on the temp row.
      setFollowUps((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, pending: false } : f)),
      );
      toast.success("Follow-up logged", {
        description: `Recorded for ${patientName}.`,
      });
    } catch {
      // Roll back: remove the optimistic row, restore the text, error toast.
      setFollowUps((prev) => prev.filter((f) => f.id !== tempId));
      setNotes(text);
      toast.error("Couldn't log the follow-up. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet onOpenChange={onOpenChange}>
      <SheetTrigger data-tour="patient-drawer-trigger" className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm text-ink-3 transition-colors hover:bg-brand-muted hover:text-brand-dk outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <Eye size={15} />
        View
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto border-line bg-bg p-6 sm:max-w-lg">
        <SheetHeader className="px-0">
          <div className="bg-gradient-to-br from-brand to-clay -mx-6 -mt-6 mb-4 px-6 pb-5 pt-8">
            <SheetTitle className="font-display text-2xl font-semibold tracking-tight text-surface">
              {patientName}
            </SheetTitle>
            {history && history.icd10Codes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {history.icd10Codes.map((code) => (
                  <span
                    key={code}
                    className="rounded-sm bg-white/20 px-1.5 py-0.5 text-[11px] font-medium text-surface"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SheetHeader>
        {/* Visit timeline */}
        <div className="mt-6 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
            Visit history
          </p>

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-sm bg-brand-muted/60"
                />
              ))}
            </div>
          )}

          {!loading && history && history.appointments.length === 0 && (
            <p className="text-sm text-ink-3">No appointments on record.</p>
          )}

          {!loading &&
            history?.appointments.map((a) => (
              <div
                key={a.id}
                className="rounded-sm border border-line/60 bg-surface p-3 shadow-sm border-l-2 border-l-brand"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    {format(new Date(a.appointmentDate), "dd MMM yyyy")}
                  </span>
                  <span
                    className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[a.status] ?? "bg-brand-muted text-brand-dk"}`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-2">{a.appointmentType}</p>
                <p className="text-xs text-ink-3">
                  {a.doctor.name ?? a.doctor.email}
                </p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {a.billedCptCode ? `CPT ${a.billedCptCode}` : "Not billed"}
                </p>
              </div>
            ))}
        </div>

        {/* Past follow-ups — proper vertical timeline with a rail + accent dots,
            on warm-white cards so they sit distinctly above the sand field. */}
        {!loading && followUps.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
              Past follow-ups
            </p>
            {/* The rail: a hairline running down the left, dots mark each entry. */}
            <div className="relative space-y-3 pl-5">
              <span
                aria-hidden
                className="absolute left-1.25 top-1 h-[calc(100%-0.5rem)] w-px bg-line-2"
              />
              {followUps.map((f) => (
                <div key={f.id} className="relative">
                  {/* Dot — clay when confirmed, hollow/pulsing while pending. */}
                  <span
                    aria-hidden
                    className={`absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border ${
                      f.pending
                        ? "animate-pulse border-clay bg-sand"
                        : "border-clay bg-clay"
                    }`}
                  />
                  <div className="rounded-sm border border-line bg-surface p-3 shadow-card">
                    <p className="text-xs leading-relaxed text-ink-2">
                      {f.notes}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <PhoneCall size={11} className="text-ink-3" />
                      <p className="text-[10px] text-ink-3">
                        {f.pending
                          ? "Saving…"
                          : format(
                              new Date(f.actionDate),
                              "dd MMM yyyy, HH:mm",
                            )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Log a follow-up — toast-only feedback. */}
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
            Log a follow-up
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Called patient, left voicemail about overdue review…"
            className="mt-2 min-h-20 rounded-sm border border-line/60 bg-surface text-sm text-ink focus-visible:ring-brand"
          />
          <button
            type="button"
            onClick={handleContacted}
            disabled={saving || notes.trim().length === 0}
            className="btn-layered mt-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Mark as contacted"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
