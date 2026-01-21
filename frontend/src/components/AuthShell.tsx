import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footerLabel: string;
  footerLink: string;
  footerLinkLabel: string;
  children: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  footerLabel,
  footerLink,
  footerLinkLabel,
  children
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-md border border-border bg-surface p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          {footerLabel}{" "}
          <Link className="font-medium text-accent hover:text-accent-hover" to={footerLink}>
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

