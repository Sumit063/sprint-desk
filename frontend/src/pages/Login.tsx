import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const requestOtp = useAuthStore((state) => state.requestOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const loginAsDemo = useAuthStore((state) => state.loginAsDemo);
  const [formError, setFormError] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpBusy, setOtpBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<"owner" | "member" | null>(null);
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

  const handleOtpRequest = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = otpEmail.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setOtpBusy(true);
    try {
      await requestOtp(normalizedEmail);
      toast.success("OTP sent");
      setOtpEmail(normalizedEmail);
      setOtpStep("verify");
    } catch {
      toast.error("Unable to send OTP");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleOtpVerify = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = otpEmail.trim();
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setOtpBusy(true);
    try {
      await verifyOtp({ email: normalizedEmail, code: otpCode });
      navigate("/app");
    } catch {
      toast.error("OTP verification failed");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleDemoLogin = async (type: "owner" | "member") => {
    setDemoBusy(type);
    try {
      await loginAsDemo(type);
      navigate("/app");
    } catch {
      toast.error("Demo login unavailable");
    } finally {
      setDemoBusy(null);
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
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-accent">
            {formError}
          </p>
        ) : null}
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            id="email"
            type="email"
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-accent">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Password
          </label>
          <input
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            id="password"
            type="password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-accent">{errors.password.message}</p>
          ) : null}
        </div>
        <button
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          type="submit"
          disabled={isSubmitting}
        >
          Sign in
        </button>
      </form>
      {googleClientId ? (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-foreground-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex justify-center">
            <div ref={googleButtonRef} className="w-full max-w-xs" />
          </div>
        </>
      ) : null}
      <div className="mt-6 rounded-md border border-border bg-muted p-4 text-sm text-foreground">
        <div className="flex items-center justify-between">
          <p className="font-medium">Email OTP</p>
          {otpStep === "verify" ? (
            <button
              type="button"
              className="text-xs font-medium text-accent hover:text-accent-hover"
              onClick={() => {
                setOtpStep("request");
                setOtpCode("");
              }}
            >
              Change email
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-foreground-muted">
          {otpStep === "verify"
            ? `Code sent to ${otpEmail}`
            : "We will email a 6-digit code for a quick sign-in."}
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={otpStep === "verify" ? handleOtpVerify : handleOtpRequest}
        >
          <div>
            <label className="text-xs font-medium text-foreground-muted" htmlFor="otp-email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
              id="otp-email"
              type="email"
              value={otpEmail}
              onChange={(event) => setOtpEmail(event.target.value)}
              disabled={otpStep === "verify"}
            />
          </div>
          {otpStep === "verify" ? (
            <div>
              <label className="text-xs font-medium text-foreground-muted" htmlFor="otp-code">
                Code
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm tracking-[0.4em] text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.trim())}
              />
            </div>
          ) : null}
          <button
            className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            type="submit"
            disabled={otpBusy}
          >
            {otpStep === "verify" ? "Verify code" : "Send OTP"}
          </button>
        </form>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          type="button"
          disabled={demoBusy !== null}
          onClick={() => handleDemoLogin("owner")}
        >
          {demoBusy === "owner" ? "Signing in..." : "Continue as Demo Owner"}
        </button>
        <button
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
          type="button"
          disabled={demoBusy !== null}
          onClick={() => handleDemoLogin("member")}
        >
          {demoBusy === "member" ? "Signing in..." : "Continue as Demo Member"}
        </button>
      </div>
    </AuthShell>
  );
}

