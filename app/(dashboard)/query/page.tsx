import SectionLabel from "@/components/ui-kit/SectionLabel";
import NLQueryInterface from "./NLQueryInterface";
import { getSavedQueries } from "./saved-actions";

// Async Server Component. No data fetched here — the interface is interactive
// and drives the runNlQuery Server Action on demand.
export default async function QueryPage() {
  const saved = await getSavedQueries();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionLabel
        eyebrow="ASK YOUR DATA"
        title="Natural language analytics"
      />
      <NLQueryInterface initialSaved={saved} />
    </div>
  );
}
