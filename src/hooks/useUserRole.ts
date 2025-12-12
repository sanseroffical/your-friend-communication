import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRole = (userId: string | null) => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setIsAdmin(false);
      setIsModerator(false);
      setIsLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (!error && data) {
        const userRoles = data.map(r => r.role as AppRole);
        setRoles(userRoles);
        setIsAdmin(userRoles.includes('admin'));
        setIsModerator(userRoles.includes('moderator'));
      }
      setIsLoading(false);
    };

    fetchRoles();
  }, [userId]);

  return { roles, isAdmin, isModerator, isLoading };
};
