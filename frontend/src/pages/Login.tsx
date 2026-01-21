import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import AuthShell from "@/components/AuthShell";
import { useAuthStore } from "@/stores/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [formError, setFormError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginForm) => {
    setFormError(null);
    try {
      await login(values);
      navigate("/app");
    } catch {
      setFormError("Unable to sign in. Check your details and try again.");
    }
  };

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let cancelled = false;
    const initialize = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            setFormError(null);
            await loginWithGoogle(response.credential);
            navigate("/app");
          } catch {
            toast.error("Google sign-in failed");
          }
        }
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320
      });
    };

    if (window.google?.accounts?.id) {
      initialize();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", initialize);
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", initialize);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    script.onerror = () => {
      if (!cancelled) {
        toast.error("Unable to load Google sign-in");
      }
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, loginWithGoogle, navigate]);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue working in SprintDesk."
      footerLabel="New here?"
      footerLink="/register"
      footerLinkLabel="Create an account"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
            {formError}
          </p>
        ) : null}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            id="email"
            type="email"
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            htmlFor="password"
          >
            Password
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            id="password"
            type="password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          ) : null}
        </div>
        <button
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          type="submit"
          disabled={isSubmitting}
        >
          Sign in
        </button>
      </form>
      {googleClientId ? (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>or</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex justify-center">
            <div ref={googleButtonRef} className="w-full max-w-xs" />
          </div>
        </>
      ) : null}
    </AuthShell>
  );
}
