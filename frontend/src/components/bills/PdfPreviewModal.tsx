import { type ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { PdfFrame } from './PdfFrame';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  load: () => Promise<Blob>;
  reloadKey: string;
  footer?: ReactNode;
}

export function PdfPreviewModal({ open, onClose, title = 'Invoice Preview', load, reloadKey, footer }: PdfPreviewModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="4xl" footer={footer}>
      <PdfFrame load={load} reloadKey={reloadKey} className="h-[70vh]" />
    </Modal>
  );
}
