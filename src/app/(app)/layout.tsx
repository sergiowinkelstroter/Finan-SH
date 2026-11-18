import { getProfile } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { getDadosAcoes } from "@/server/acoes";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [perfil, dados] = await Promise.all([getProfile(), getDadosAcoes()]);

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <Sidebar perfil={perfil} dados={dados} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {children}
      </main>
      <BottomNav perfil={perfil} dados={dados} />
    </div>
  );
}
