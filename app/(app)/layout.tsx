import Sidebar from "@/components/layout/sidebar"
import Topbar from "@/components/layout/topbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <div className="ml-[240px]">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
