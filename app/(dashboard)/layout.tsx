import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        name={session.user.name}
        email={session.user.email}
        role={session.user.role}
      />
      <div className="ml-60 min-h-screen bg-bg">
        <TopBar clinicName={session.user.clinicName} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
