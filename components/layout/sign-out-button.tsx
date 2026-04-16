"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    const toastId = toast.loading("Signing out...");

    const res = await fetch("/api/auth/signout", { method: "POST" });

    toast.dismiss(toastId);

    if (res.ok || res.redirected) {
      router.push("/login");
      router.refresh();
    } else {
      toast.error("Failed to sign out. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      disabled={loading}
    >
      <LogOut />
      Sign out
    </Button>
  );
}
