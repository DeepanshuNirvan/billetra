import { useEffect, useState } from 'react';
import { Loader2, FileWarning } from 'lucide-react';
import { clsx } from 'clsx';

interface PdfFrameProps {
  // Async loader returning the PDF blob. Re-run whenever `reloadKey` changes.
  load: () => Promise<Blob>;
  reloadKey: string;
  title?: string;
  className?: string;
}

// Renders a PDF blob inside an iframe with loading / error states.
export function PdfFrame({ load, reloadKey, title = 'PDF preview', className }: PdfFrameProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setStatus('loading');

    load()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  return (
    <div className={clsx('relative bg-gray-100 rounded-lg overflow-hidden', className)}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">Generating preview…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
          <FileWarning className="h-6 w-6" />
          <span className="text-xs">Could not load preview</span>
        </div>
      )}
      {url && status === 'ready' && (
        <iframe src={`${url}#toolbar=0&navpanes=0`} title={title} className="h-full w-full border-0" />
      )}
    </div>
  );
}
