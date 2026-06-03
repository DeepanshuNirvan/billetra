import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BILL_TEMPLATES } from '../../utils/constants';
import { billsApi } from '../../api/bills';
import { PdfFrame } from './PdfFrame';

interface BillTemplatesProps {
  value: string;
  onChange: (template: string) => void;
}

// Template chooser: a chip list on the left, a live sample PDF preview on the
// right so users see exactly what each template produces before selecting.
export function BillTemplates({ value, onChange }: BillTemplatesProps) {
  const [preview, setPreview] = useState(value || BILL_TEMPLATES[0].value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* Chip list */}
      <div className="flex flex-col gap-2 md:max-h-[60vh] md:overflow-y-auto pr-1">
        {BILL_TEMPLATES.map((tpl) => {
          const selected = value === tpl.value;
          const active = preview === tpl.value;
          return (
            <button
              key={tpl.value}
              type="button"
              onClick={() => setPreview(tpl.value)}
              className={clsx(
                'relative text-left rounded-xl border p-3 transition-all',
                active ? 'border-primary-500 ring-2 ring-primary-200 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-7 w-7 rounded-lg shrink-0"
                  style={{ background: tpl.accent }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {tpl.label}
                    {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-600" />}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{tpl.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="flex flex-col gap-3">
        <PdfFrame
          load={() => billsApi.samplePdf(preview)}
          reloadKey={preview}
          title="Template sample"
          className="h-[55vh] min-h-[360px] border border-gray-200"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Sample shown with your business details and demo items.
          </p>
          <button
            type="button"
            onClick={() => onChange(preview)}
            disabled={value === preview}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              value === preview
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            )}
          >
            {value === preview ? 'Selected' : `Use ${BILL_TEMPLATES.find((t) => t.value === preview)?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
