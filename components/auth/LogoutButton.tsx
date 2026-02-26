"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  callbackUrl?: string;
};

export default function LogoutButton({ callbackUrl = "/auth/login" }: LogoutButtonProps) {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl })}>
      Logout
    </Button>
  );
}
