import { DashboardLayout } from "@/components/navs/main/dashboard-layout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}