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
    scheduled: "bg-blue-100 text-blue-700",
    "checked-in": "bg-yellow-100 text-yellow-700",
    "in-progress": "bg-terra-100 text-terra-600",
    completed: "bg-green-100 text-green-700",
    "no-show": "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
    submitted: "bg-blue-100 text-blue-700",
    processing: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    denied: "bg-red-100 text-red-700",
    appealed: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
    "pending-refill": "bg-yellow-100 text-yellow-700",
    discontinued: "bg-gray-100 text-gray-500",
    pending: "bg-yellow-100 text-yellow-700",
    urgent: "bg-red-100 text-red-700",
    standard: "bg-blue-100 text-blue-700",
  }
  return colors[status] || "bg-gray-100 text-gray-600"
}
