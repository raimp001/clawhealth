import Sidebar from "@/components/layout/sidebar"
import Topbar from "@/components/layout/topbar"
import AgentBar from "@/components/layout/agent-bar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(240,90,61,0.11),transparent_35%),radial-gradient(circle_at_88%_0%,rgba(31,169,113,0.12),transparent_32%)]" />
      <Sidebar />
      <div className="relative lg:ml-[248px]">
        <AgentBar />
        <Topbar />
        <main className="px-4 pb-10 pt-5 sm:px-5 lg:px-8 lg:pt-6">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
