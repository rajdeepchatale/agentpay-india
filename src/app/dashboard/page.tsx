import type { Metadata } from "next";
import { AuditTrailViewer } from "@/components/dashboard/AuditTrailViewer";

export const metadata: Metadata = {
  title: "Audit trail — AgentPay India",
  description:
    "Every decision the agent made, with the reasoning behind it. Guardrail checks, consent requests and orders, written as they happened.",
};

export default function DashboardPage() {
  return <AuditTrailViewer />;
}
