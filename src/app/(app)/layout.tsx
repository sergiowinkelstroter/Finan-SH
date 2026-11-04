import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getProfile();

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <Sidebar perfil={perfil} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {children}
      </main>
      <BottomNav perfil={perfil} />
    </div>
  );
}
