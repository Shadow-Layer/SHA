"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  message: string;
  relatedId: string | null;
  relatedType: string | null;
  isRead: boolean;
  createdAt: string;
};

function getRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "now";
  }

  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const ranges: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const range of ranges) {
    if (Math.abs(diffSeconds) >= range.seconds || range.unit === "second") {
      return rtf.format(Math.round(diffSeconds / range.seconds), range.unit);
    }
  }

  return "now";
}

function getDestination(notification: NotificationItem) {
  if (notification.relatedType === "inbox") {
    return "/inbox";
  }
  if (notification.relatedType === "listing" && notification.relatedId) {
    return `/listings/${notification.relatedId}`;
  }
  if (notification.relatedType === "application") {
    return "/dashboard";
  }
  return "/dashboard";
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const loadUnreadCount = useCallback(async () => {
    const response = await fetch("/api/notifications?unreadOnly=true", { cache: "no-store" });
    const data = (await response.json()) as { notifications?: NotificationItem[] };
    setUnreadCount(Array.isArray(data.notifications) ? data.notifications.length : 0);
  }, []);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=10", { cache: "no-store" });
      const data = (await response.json()) as { notifications?: NotificationItem[] };
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current) {
        return;
      }
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", onOutsideClick);
      void loadUnreadCount();
      void loadRecent();
    }

    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [loadRecent, loadUnreadCount, open]);

  const unreadInList = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  async function handleClick(notification: NotificationItem) {
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });
      setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

    setOpen(false);
    router.push(getDestination(notification));
    router.refresh();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-background p-2 shadow-lg">
          <div className="border-b px-2 pb-2">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadInList} unread in recent activity
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto py-1">
            {loading ? <p className="px-2 py-3 text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</p>
            ) : null}
            {items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleClick(notification)}
                className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${
                      notification.isRead ? "bg-transparent" : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{getRelativeTime(notification.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
