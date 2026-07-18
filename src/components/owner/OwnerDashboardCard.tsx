import { Card, CardDescription, CardTitle } from "@/components/ui";

interface OwnerDashboardCardProps {
  label: string;
  value: number | string;
  description?: string;
  hasAlert?: boolean;
}

export function OwnerDashboardCard({
  label,
  value,
  description,
  hasAlert = false,
}: OwnerDashboardCardProps) {
  return (
    <Card>
      <CardDescription>
        <span className="inline-flex items-center gap-1.5">
          {label}
          {hasAlert && (
            <>
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary-500"
                aria-hidden="true"
              />
              <span className="sr-only">신규 지원 있음</span>
            </>
          )}
        </span>
      </CardDescription>
      <CardTitle className="mt-1 text-h2 font-bold">{value}</CardTitle>
      {description && (
        <p className="mt-1 text-caption text-neutral-400">{description}</p>
      )}
    </Card>
  );
}
