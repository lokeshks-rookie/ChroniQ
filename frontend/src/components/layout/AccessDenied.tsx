import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export interface AccessDeniedProps {
  requiredCapability?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredCapability }) => {
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" strokeWidth={1.5} />
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider text-danger mb-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-danger inline-block" />
        <span>HTTP 403 • ACCESS RESTRICTED</span>
      </div>

      <h2 className="text-2xl font-medium text-ink mb-2">Permission required</h2>

      <p className="text-sm text-ink/70 max-w-md mb-6 leading-relaxed">
        Your current active role (<span className="font-semibold text-ink uppercase">{currentRole.replace('_', ' ')}</span>) does not have permission to view or manage this section.
        {requiredCapability && (
          <span className="block text-xs text-ink/60 mt-1">
            Missing capability: <code>{requiredCapability}</code>
          </span>
        )}
      </p>

      <div className="p-3 bg-accent/10 border border-accent/30 rounded-card max-w-md mb-6 text-xs text-ink">
        <span className="font-semibold">Switch Demo Role:</span> Click the role switcher in the top right corner to switch to Hospital Admin, Receptionist, or Doctor.
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate(currentRole === 'doctor' ? '/doctor' : '/admin')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          {currentRole === 'doctor' ? 'Return to My Day' : 'Return to Dashboard'}
        </Button>
      </div>
    </div>
  );
};
