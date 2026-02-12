import Sidebar from "@/components/layout/sidebar"
import Topbar from "@/components/layout/topbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <div className="lg:ml-[240px]">
        <Topbar />
        <main className="p-4 pt-16 lg:pt-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
