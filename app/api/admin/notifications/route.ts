import { NextRequest, NextResponse } from "next/server"
import {
  OPENRX_ADMIN_ID,
  listAdminNotifications,
  markAdminNotificationRead,
} from "@/lib/provider-applications"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const adminId = searchParams.get("adminId") || OPENRX_ADMIN_ID
  const notifications = listAdminNotifications(adminId)
  const unreadCount = notifications.filter((item) => !item.isRead).length
  return NextResponse.json({
    notifications,
    unreadCount,
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      notificationId?: string
    }
    if (!body.notificationId) {
      return NextResponse.json(
        { error: "notificationId is required." },
        { status: 400 }
      )
    }
    const notification = markAdminNotificationRead(body.notificationId)
    return NextResponse.json({ notification })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notification."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
