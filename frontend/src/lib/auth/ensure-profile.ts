import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(user: User) {
  const supabase = await createClient();

  const payload = {
    id: user.id,
    full_name:
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Failed to ensure profile", error.message);
  }
}
