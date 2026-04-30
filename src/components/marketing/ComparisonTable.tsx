import { Check, Minus } from "lucide-react";

/**
 * ComparisonTable — rendered as a real <table> because answer engines
 * (and screen readers) parse them better than divs-with-grid.
 */
const COLUMNS = ["PhotoBrief", "Email photo dump", "Typeform + upload", "Jotform photo form"] as const;

const ROWS: Array<{ feature: string; values: Array<boolean | string> }> = [
  { feature: "App-free for recipient", values: [true, true, true, true] },
  { feature: "Guided per-shot prompts", values: [true, false, "partial", "partial"] },
  { feature: "AI quality gate (blur, light, framing)", values: [true, false, false, false] },
  { feature: "Missing-shot follow-up", values: [true, false, false, false] },
  { feature: "Auto-generated brief & summary", values: [true, false, false, false] },
  { feature: "Readiness score per submission", values: [true, false, false, false] },
  { feature: "Branded recipient page", values: [true, false, "partial", "partial"] },
  { feature: "REST API + webhooks", values: [true, false, true, true] },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="h-4 w-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <span className="text-xs font-medium uppercase text-muted-foreground">{value}</span>;
}

export function ComparisonTable() {
  return (
    <section aria-labelledby="comparison-heading" className="bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Comparison</p>
          <h2
            id="comparison-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            PhotoBrief vs. generic intake forms
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Where AI-guided visual intake actually changes the outcome.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="mx-auto w-full max-w-4xl border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="hairline-b sticky left-0 bg-background px-4 py-3 text-left font-semibold text-foreground"
                >
                  Capability
                </th>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`hairline-b px-4 py-3 text-center font-semibold ${i === 0 ? "text-primary" : "text-foreground"}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <th
                    scope="row"
                    className="hairline-b sticky left-0 bg-background px-4 py-3 text-left font-medium text-foreground"
                  >
                    {row.feature}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className="hairline-b px-4 py-3 text-center">
                      <Cell value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
