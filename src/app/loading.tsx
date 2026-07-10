import { Card } from "@/components/ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="page-container py-10">
        <div className="mx-auto w-full max-w-3xl">
          <Card className="flex flex-col gap-4">
            <div className="h-5 w-32 rounded-md bg-neutral-100" />
            <div className="h-8 w-3/4 rounded-md bg-neutral-100" />
            <div className="grid gap-3">
              <div className="h-20 rounded-md bg-neutral-100" />
              <div className="h-20 rounded-md bg-neutral-100" />
              <div className="h-20 rounded-md bg-neutral-100" />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
