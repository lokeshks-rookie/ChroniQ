import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 'lg',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[width];

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className={`fixed inset-y-0 right-0 left-auto m-0 h-full max-h-full bg-base text-ink border-l border-ink/15 p-0 shadow-2xl backdrop:bg-ink/40 w-full ${widthClasses} z-50 overflow-hidden transition-transform duration-200`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-ink/10">
          <div>
            {eyebrow && (
              <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-ink inline-block shrink-0" />
                <span>{eyebrow}</span>
              </div>
            )}
            <h2 className="text-xl font-medium text-ink">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/70 hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm text-ink">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-ink/10 bg-base shrink-0">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
};
