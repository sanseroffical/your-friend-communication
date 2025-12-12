import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck } from 'lucide-react';

interface AdminBadgeProps {
  role: 'admin' | 'moderator';
}

const AdminBadge = ({ role }: AdminBadgeProps) => {
  if (role === 'admin') {
    return (
      <Badge variant="default" className="gap-1 text-xs px-1.5 py-0">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-xs px-1.5 py-0">
      <Shield className="h-3 w-3" />
      Mod
    </Badge>
  );
};

export default AdminBadge;
