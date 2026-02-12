import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-terra/10 to-terra/5 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-terra font-serif">404</span>
        </div>
        <h1 className="text-2xl font-serif text-warm-800">Page not found</h1>
        <p className="text-sm text-warm-500 mt-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-terra text-white text-sm font-semibold rounded-xl hover:bg-terra-dark transition flex items-center gap-2"
          >
            <Home size={14} />
            Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white text-warm-800 text-sm font-semibold rounded-xl border border-sand hover:border-terra/30 transition flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
