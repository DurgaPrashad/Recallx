import { Card, CardBody } from "@/components/ui/card";
import { AskPanel } from "@/components/ask/ask-panel";

export default function AskPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Ask Recall-X</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Conversational investigation across all of Recall-X&apos;s memory. Answers clearly separate{" "}
          <span className="font-medium text-[var(--color-accent-strong)]">remembered evidence</span> from{" "}
          <span className="font-medium text-[var(--color-warning)]">AI inference</span>.
        </p>
      </div>

      <Card>
        <CardBody>
          <AskPanel
            suggestions={[
              "Have we seen this before?",
              "What failed last time we had a connection pool problem?",
              "Why shouldn't I restart the pods during a checkout-api incident?",
              "Which previous incident looks most similar to a database saturation problem?",
              "Have database connection issues affected checkout before?",
              "What is the fastest investigation path for an auth-service outage?",
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
