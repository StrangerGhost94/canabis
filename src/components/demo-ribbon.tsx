import { isDemo } from "@/lib/env";

export function DemoRibbon() {
  if (!isDemo) return null;
  return (
    <div className="demo-ribbon" role="note">
      <strong>Demo environment.</strong> Every store, licence, partner and order here is fictional. Licence checks are simulated and no real registry is consulted.
    </div>
  );
}
