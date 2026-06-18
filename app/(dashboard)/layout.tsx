import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProductTour from "@/lib/tour/ProductTour";
import prisma  from "@/lib/prisma";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Suspense } from "react";
import AlertToastListener from "@/components/AlertToastListener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  const unreadCount = await prisma.alert.count({
    where: { clinicId: user.clinicId, isRead: false },
  });

  return (
    <>
      <Suspense fallback={null}>
        <ProductTour />
      </Suspense>
      <AlertToastListener clinicId={session.user.clinicId} />
      <div className="flex h-screen bg-bg">
        <Sidebar
          name={user.name ?? null}
          email={user.email}
          role={user.role}
          unreadCount={unreadCount}
        />
        <div className="flex flex-1 flex-col overflow-hidden pl-60">
          <TopBar clinicName={user.clinicName ?? "Clinic"} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
