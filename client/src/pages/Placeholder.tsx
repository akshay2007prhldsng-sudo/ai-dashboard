import { Card } from "../components/ui";

export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="max-w-lg mx-auto mt-16">
      <Card className="text-center py-12">
        <h1 className="text-xl font-semibold text-accent-bright mb-2">{title}</h1>
        <p className="text-sm text-ink-muted">{note}</p>
      </Card>
    </div>
  );
}
