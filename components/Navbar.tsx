import Link from "next/link";

import LogoutButton from "@/components/auth/LogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
};

function getRoleNav(role?: "student" | "landlord" | "service_provider" | "admin"): NavItem[] {
  if (role === "student") {
    return [
      { label: "Listings", href: "/listings" },
      { label: "Services", href: "/services" },
      { label: "Forum", href: "/forum" },
      { label: "Inbox", href: "/inbox" },
      { label: "Dashboard", href: "/dashboard/student" },
    ];
  }

  if (role === "landlord") {
    return [
      { label: "Listings", href: "/listings" },
      { label: "Services", href: "/services" },
      { label: "Inbox", href: "/inbox" },
      { label: "Dashboard", href: "/dashboard/landlord" },
    ];
  }

  if (role === "admin") {
    return [
      { label: "Services", href: "/services" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Admin Panel", href: "/admin" },
    ];
  }

  if (role === "service_provider") {
    return [
      { label: "Services", href: "/services" },
      { label: "Inbox", href: "/inbox" },
      { label: "Dashboard", href: "/dashboard/provider" },
    ];
  }

  return [
    { label: "Listings", href: "/listings" },
    { label: "Services", href: "/services" },
    { label: "Share a Lead", href: "/submit-lead" },
  ];
}

export default async function Navbar() {
  const session = await getAuthSession().catch(() => null);
  const role = session?.user?.role;
  const navLinks = getRoleNav(role);
  const isAuthenticated = Boolean(session?.user);

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span>SHA</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex max-w-[45vw] items-center gap-4 overflow-x-auto whitespace-nowrap">
            {navLinks.map((link) => (
              <Link
                key={`${role ?? "guest"}-${link.href}`}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <LogoutButton callbackUrl="/auth/login" />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
