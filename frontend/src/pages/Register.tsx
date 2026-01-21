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
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
            {formError}
          </p>
        ) : null}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="name">
            Name
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            id="name"
            type="text"
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          ) : null}
        </div>
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
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
