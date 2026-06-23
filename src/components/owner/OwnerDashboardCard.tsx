import { Card, CardDescription, CardTitle } from "@/components/ui";

interface OwnerDashboardCardProps {
  label: string;
  value: number | string;
  description?: string;
}

export function OwnerDashboardCard({
  label,
  value,
  description,
}: OwnerDashboardCardProps) {
  return (
    <Card>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="mt-1 text-h2 font-bold">{value}</CardTitle>
      {description && (
        <p className="mt-1 text-caption text-neutral-400">{description}</p>
      )}
    </Card>
  );
}
