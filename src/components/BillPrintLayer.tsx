import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bill } from '../types';
import { RentalBillTemplate, SaleBillTemplate } from './BillPreview';
interface BillPrintLayerProps {
  bill: Bill | null;
  onDone: () => void;
}
/**
 * Renders a bill off-screen and sends it straight to the printer.
 * Used for automatic receipt printing after a bill is changed or closed,
 * so the cashier never has to leave the page they're working on.
 */
export function BillPrintLayer({ bill, onDone }: BillPrintLayerProps) {
  useEffect(() => {
    if (!bill) return;
    let finished = false;
    document.body.classList.add('printing-bill');
    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove('printing-bill');
      window.removeEventListener('afterprint', finish);
      onDone();
    };
    window.addEventListener('afterprint', finish);
    // Give the template a frame to lay out (and the logo a chance to load)
    const printTimer = window.setTimeout(() => {
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.printSilent) {
        // @ts-ignore
        window.electronAPI.printSilent();
      } else {
        window.print();
      }
      // Fallback for browsers that don't fire `afterprint`
      window.setTimeout(finish, 500);
    }, 350);
    const guard = window.setTimeout(finish, 10000);
    return () => {
      window.clearTimeout(printTimer);
      window.clearTimeout(guard);
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing-bill');
    };
  }, [bill, onDone]);
  if (!bill) return null;
  const isRental = bill.items.some((item) => item.type === 'rent');
  return createPortal(
    <div className="bill-print-layer" aria-hidden="true">
      <div id="print-area" className="bg-white">
        {isRental ?
        <RentalBillTemplate bill={bill} /> :

        <SaleBillTemplate bill={bill} />
        }
      </div>
    </div>,
    document.body
  );
}