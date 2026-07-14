"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

interface LoginResult {
  error?: string;
}

export async function login(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Log the real reason server-side, but never tell the client whether
    // it was the email or the password that was wrong — that distinction
    // is exactly what account enumeration attacks rely on.
    console.error("Login failed:", error.message);
    return { error: "Incorrect email or password" };
  }

  redirect("/dashboard");
}
