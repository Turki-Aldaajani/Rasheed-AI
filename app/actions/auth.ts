"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Check specific errors or provide generic safe message
    if (error.message.includes("Invalid login credentials")) {
      return { error: "بيانات الدخول غير صحيحة" };
    }
    return { error: "حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى" };
  }

  redirect("/app");
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  if (!email || !password || !displayName) {
    return { error: "الرجاء تعبئة جميع الحقول المطلوبة" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "البريد الإلكتروني مسجل مسبقاً" };
    }
    return { error: "حدث خطأ أثناء إنشاء الحساب، حاول مرة أخرى" };
  }

  // Check if session is created or email confirmation is required
  if (data.session) {
    redirect("/app");
  } else {
    // Returning a success flag to show the UI message for email confirmation
    return { success: true, message: "تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب." };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
