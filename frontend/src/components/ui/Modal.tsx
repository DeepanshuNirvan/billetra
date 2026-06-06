import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  footer,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content
          className={clsx(
            // Mobile: bottom sheet. Desktop: centered dialog.
            'fixed z-50 bg-white shadow-2xl flex flex-col',
            'inset-x-0 bottom-0 w-full rounded-t-2xl max-h-[92vh] sheet-up',
            'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2',
            'md:rounded-2xl md:max-h-[90vh] md:mx-4 md:animate-in md:fade-in md:zoom-in-95 md:duration-200',
            sizeClasses[size]
          )}
        >
          {/* Mobile grab handle */}
          <div className="md:hidden flex justify-center pt-2.5 pb-1">
            <span className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>
          {title && (
            <div className="flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-gray-100">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-0.5 text-sm text-gray-500">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
