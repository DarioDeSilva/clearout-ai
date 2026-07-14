"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const signupSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

interface SignupResult {
  error?: string;
  needsEmailConfirmation?: boolean;
}

export async function signup(formData: FormData): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("Signup failed:", error.message);
    return { error: error.message };
  }

  // With email confirmation enabled (the Supabase default), signUp
  // succeeds but returns no session until the user clicks the link in
  // their inbox — so there's nothing to redirect into yet.
  if (!data.session) {
    return { needsEmailConfirmation: true };
  }

  redirect("/dashboard");
}
