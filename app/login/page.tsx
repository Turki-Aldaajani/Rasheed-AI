"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button, Card, SectionTitle } from "@/components/ui/Primitives";
import { Wordmark } from "@/components/layout/Logo";

const initialState: any = { error: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brand-50/40 p-5 sm:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        
        <Card className="p-6 sm:p-8">
          <SectionTitle title="تسجيل الدخول" hint="أهلاً بك مجدداً في رشيد" />

          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink-700">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                dir="ltr"
                className="rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink-700">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                className="rounded-xl border border-ink-300 bg-white px-4 py-2.5 text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>

            {state?.error && (
              <p className="text-sm font-medium text-red-600">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="mt-2 w-full">
              {isPending ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            ليس لديك حساب؟{" "}
            <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
              أنشئ حساباً جديداً
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
