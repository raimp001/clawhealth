import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-900/30 text-blue-400",
    "checked-in": "bg-yellow-900/30 text-yellow-400",
    "in-progress": "bg-terra/20 text-terra",
    completed: "bg-green-900/30 text-green-400",
    "no-show": "bg-red-900/30 text-red-400",
    cancelled: "bg-sand/50 text-cloudy",
    submitted: "bg-blue-900/30 text-blue-400",
    processing: "bg-yellow-900/30 text-yellow-400",
    approved: "bg-green-900/30 text-green-400",
    denied: "bg-red-900/30 text-red-400",
    appealed: "bg-orange-900/30 text-orange-400",
    paid: "bg-green-900/30 text-green-400",
    active: "bg-green-900/30 text-green-400",
    "pending-refill": "bg-yellow-900/30 text-yellow-400",
    discontinued: "bg-sand/50 text-cloudy",
    pending: "bg-yellow-900/30 text-yellow-400",
    urgent: "bg-red-900/30 text-red-400",
    standard: "bg-blue-900/30 text-blue-400",
  }
  return colors[status] || "bg-sand/50 text-cloudy"
}
