import { cn } from "@/lib/utils";

type Status = 'active' | 'pending_review' | 'approved' | 'failed' | 'pending';

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-accent/20 text-accent border-accent/30' },
  pending_review: { label: 'Pending Review', className: 'bg-warning/20 text-warning border-warning/30' },
  pending: { label: 'Pending', className: 'bg-warning/20 text-warning border-warning/30' },
  approved: { label: 'Approved', className: 'bg-success/20 text-success border-success/30' },
  failed: { label: 'Failed', className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
      config.className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        status === 'active' && "bg-accent animate-pulse",
        status === 'pending_review' && "bg-warning",
        status === 'pending' && "bg-warning",
        status === 'approved' && "bg-success",
        status === 'failed' && "bg-destructive",
      )} />
      {config.label}
    </span>
  );
}
