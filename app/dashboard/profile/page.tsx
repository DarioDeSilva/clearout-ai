import { createClient } from "@/lib/supabase-server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mt-2 text-gray-600">{user?.email}</p>
    </div>
  );
}
