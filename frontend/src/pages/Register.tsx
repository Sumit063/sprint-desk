import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import AuthShell from "@/components/AuthShell";
import { useAuthStore } from "@/stores/auth";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (values: RegisterForm) => {
    setFormError(null);
    try {
      await registerUser(values);
      navigate("/app");
    } catch {
      setFormError("Unable to register. Try a different email.");
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking issues and building a shared knowledge base."
      footerLabel="Already have an account?"
      footerLink="/login"
      footerLinkLabel="Sign in"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {formError ? (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-accent">
            {formError}
          </p>
        ) : null}
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="name">
            Name
          </label>
          <input
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            id="name"
            type="text"
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-accent">{errors.name.message}</p>
          ) : null}
        </div>
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
          Create account
        </button>
      </form>
    </AuthShell>
  );
}

