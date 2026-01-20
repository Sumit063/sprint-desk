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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {footerLabel}{" "}
          <Link className="font-medium text-blue-600 hover:text-blue-700" to={footerLink}>
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
