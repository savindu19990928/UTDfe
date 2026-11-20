import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bill } from '../types';
import { RentalBillTemplate } from './BillPreview';
import { triggerSilentPrint } from '../utils/print';

interface BillPrintLayerProps {
  bill: Bill | null;
  onDone: () => void;
  onError?: (error: string) => void;
}
/**
 * Renders a rental bill off-screen and sends it straight to the printer.
 * Used for automatic silent receipt printing when a rental bill is closed,
 * so the cashier never has to leave the page they're working on.
 */
export function BillPrintLayer({ bill, onDone, onError }: BillPrintLayerProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!bill) return;
    const isRental = bill.items.some((item) => item.type === 'rent');
    if (!isRental) {
      onDoneRef.current();
      return;
    }
    let finished = false;
    document.body.classList.add('printing-bill');
    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove('printing-bill');
      window.removeEventListener('afterprint', finish);
      onDoneRef.current();
    };
    window.addEventListener('afterprint', finish);
    // Give the template a frame to lay out (and the logo a chance to load)
    const printTimer = window.setTimeout(async () => {
      const result = await triggerSilentPrint();
      if (!result.success) {
        onErrorRef.current?.(
          result.error ||
            'Failed to print the rental bill. Please check your printer connection.'
        );
      }
      window.setTimeout(finish, 300);
    }, 350);
    const guard = window.setTimeout(finish, 18000);
    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(guard);
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing-bill');
    };
  }, [bill]);
  if (!bill) return null;
  const isRental = bill.items.some((item) => item.type === 'rent');
  if (!isRental) return null;
  return createPortal(
    <div className="bill-print-layer" aria-hidden="true">
      <div id="print-area" className="bg-white">
        <RentalBillTemplate bill={bill} />
      </div>
    </div>,
    document.body
  );
}