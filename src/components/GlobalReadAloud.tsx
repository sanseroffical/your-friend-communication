import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReadAloudButton from "./ReadAloudButton";

const GlobalReadAloud = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!userId) return null;
  return <ReadAloudButton userId={userId} />;
};

export default GlobalReadAloud;
