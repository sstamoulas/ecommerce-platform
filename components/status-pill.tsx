import { formatStatusLabel, isActiveState } from "@/lib/utils";

type StatusPillProps = {
  status: string;
  label?: string;
};

function toneForStatus(status: string) {
  if (
    ["delivered", "fulfilled", "captured", "active", "paid", "shipped", "accepted"].includes(status)
  ) {
    return "success";
  }

  if (["in_transit", "label_created", "allocated", "authorized", "sent"].includes(status)) {
    return "info";
  }

  if (["pending", "draft", "scheduled", "queued"].includes(status)) {
    return "warning";
  }

  if (
    [
      "exception",
      "failed",
      "canceled",
      "refunded",
      "returned",
      "disabled",
      "rejected",
    ].includes(status)
  ) {
    return "danger";
  }

  return isActiveState(status) ? "success" : "neutral";
}

export function StatusPill({ status, label }: StatusPillProps) {
  return (
    <span className="status-pill" data-tone={toneForStatus(status)}>
      {label ?? formatStatusLabel(status)}
    </span>
  );
}
