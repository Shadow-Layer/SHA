"use client";

import Link from "next/link";
import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavbarMobileMenuProps = {
  navLinks: Array<{ label: string; href: string }>;
  isAuthenticated: boolean;
};

export default function NavbarMobileMenu({
  navLinks,
  isAuthenticated,
}: NavbarMobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="text-sm font-medium sm:hidden"
        aria-label="Open navigation menu"
        type="button"
      >
        ☰
      </SheetTrigger>
      <SheetContent side="left">
        <div className="mt-8 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={`${isAuthenticated ? "auth" : "guest"}-${link.href}`}
              href={link.href}
              className="block py-3 px-4 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
