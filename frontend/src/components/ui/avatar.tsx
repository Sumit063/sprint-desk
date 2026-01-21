import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
};

const sizes = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-9 w-9 text-sm"
};

const getInitials = (name?: string | null, email?: string | null) => {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
    return initials.join("") || "U";
  }

  if (email) {
    const local = email.split("@")[0] ?? "";
    return local.slice(0, 2).toUpperCase() || "U";
  }

  return "U";
};

export function Avatar({ name, email, src, size = "sm", className }: AvatarProps) {
  const label = name ?? email ?? "User";
  const initials = getInitials(name, email);

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted font-semibold text-foreground",
        sizes[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </span>
  );
}
