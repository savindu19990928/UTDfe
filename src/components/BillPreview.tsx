import React, { useEffect } from 'react';
import { Bill } from '../types';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import { formatPercent, formatPrice } from '../utils/format';
import { useRentalConditions } from '../hooks/useRentalConditions';
const LOGO_URL = "./WhatsApp_Image_2025-12-13_at_2.34.53_PM.jpg";

interface BillPreviewProps {
  bill: Bill;
  onBack: () => void;
  onNewOrder: () => void;
  autoPrint?: boolean;
}
export function BillPreview({
  bill,
  onBack,
  onNewOrder,
  autoPrint
}: BillPreviewProps) {
  const handlePrint = () => {
    // @ts-ignore
    if (window.electronAPI && window.electronAPI.printSilent) {
      // @ts-ignore
      window.electronAPI.printSilent();
    } else {
      window.print();
    }
  };
  // Freshly generated bills go straight to the printer
  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => {
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.printSilent) {
        // @ts-ignore
        window.electronAPI.printSilent();
      } else {
        window.print();
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [autoPrint, bill.id]);
  const isRental = bill.items.some((item) => item.type === 'rent');
  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-[8.5in] mx-auto mb-6 flex justify-between items-center no-print">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-[#1a1a2e] transition-colors font-medium">
          
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onNewOrder}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium shadow-sm transition-colors">
            
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            New Order
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#2d4059] font-medium shadow-sm transition-colors">
            
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </button>
        </div>
      </div>

      <div
        id="print-area"
        className="max-w-[8.5in] mx-auto bg-white shadow-lg no-print-shadow min-h-[11in] print:min-h-0 print:h-auto relative">
        
        {isRental ?
        <RentalBillTemplate bill={bill} /> :

        <SaleBillTemplate bill={bill} />
        }
      </div>
    </div>);

}
export function RentalBillTemplate({ bill }: {bill: Bill;}) {
  const { conditions } = useRentalConditions();
  const subtotal = bill.subtotal;
  const discountPercent = bill.discount;
  const discountAmount = bill.discountAmount;
  const total = bill.total;
  const deposit = bill.deposit || 0;
  // Include fines in refund/owing calculation
  const finesList = Array.isArray(bill.fines) ? bill.fines : [];
  const totalFines = finesList.reduce((s, f) => s + Number(f.fine), 0);
  const netOwed = total + totalFines;
  const refund = deposit > netOwed ? deposit - netOwed : 0;
  const owing = deposit < netOwed ? netOwed - deposit : 0;
  const isOpen = bill.rentalStatus !== 'closed';
  const hasDiscount = discountAmount > 0;
  const hasFines = finesList.length > 0;
  const printedTime = new Date().toLocaleString('en-GB');
  // Map the API/saved payment method to a readable label
  const paymentLabel =
  bill.paymentMethod === 'card' ?
  'CARD' :
  bill.paymentMethod === 'transfer' ||
  bill.paymentMethod === 'bank_transfer' ?
  'BANK TRANSFER' :
  'CASH';
  // Helper to split a number into rupees and cents
  const splitPrice = (amount: number) => {
    const abs = Math.abs(amount);
    const rupees = Math.floor(abs);
    const cents = Math.round((abs - rupees) * 100);
    return {
      rupees: rupees.toLocaleString(),
      cents: cents.toString().padStart(2, '0')
    };
  };
  return (
    <div className="p-6 text-black font-sans text-sm h-full flex flex-col relative">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        {/* Top Left: Customer Details */}
        <div className="text-xs space-y-1 leading-relaxed w-1/3">
          <p>
            <span className="inline-block w-24">Bill No:</span>
            <span className="font-bold">{bill.id}</span>
          </p>
          <p>
            <span className="inline-block w-24">Name:</span>
            <span className="font-bold">{bill.customer.name}</span>
          </p>
          <p>
            <span className="inline-block w-24">NIC No:</span>
            <span className="font-bold">{bill.customerNic || '-'}</span>
          </p>
          <p>
            <span className="inline-block w-24">Taken ID:</span>
            <span className="font-bold">
              {bill.nicTaken ?
              'NIC' :
              bill.isPassportTaken ?
              'Passport' :
              bill.isDrivingLicenceTaken ?
              'Driving Licence' :
              'None'}
            </span>
          </p>
          <p>
            <span className="inline-block w-24">Mobile No:</span>
            <span className="font-bold">{bill.customer.phone}</span>
          </p>
          <p>
            <span className="inline-block w-24">Payment:</span>
            <span className="font-bold">{paymentLabel}</span>
          </p>
          <p>
            <span className="inline-block w-24">Date & Time:</span>
            <span className="font-bold">{printedTime}</span>
          </p>
          <p className="flex">
            <span className="inline-block w-24">Address:</span>
            <span
              className={`font-bold ${
              bill.customer.address && bill.customer.address.length > 25 ?
              'max-w-[12rem] whitespace-normal' :
              'whitespace-nowrap'}`
              }>
              
              {bill.customer.address?.trim() ? bill.customer.address : '-'}
            </span>
          </p>
        </div>

        {/* Top Middle: Logo */}
        <div className="w-1/3 flex flex-col items-center justify-start">
          <img src={LOGO_URL} alt="Logo" className="h-16 w-auto mb-2" />
          <div className="mt-2 font-bold text-sm py-1 inline-block px-4 uppercase text-center font-['UN-Sandhyane']">
            උපකරණ නිකුත් කිරීමේ කුවිතාන්සිය
          </div>
        </div>

        {/* Top Right: Company Details */}
        <div className="w-1/3 text-right">
          <h1 className="text-xl font-bold uppercase tracking-wide text-black mb-1">
            Universal Tool Depot
          </h1>
          <p className="text-xs text-black font-bold space-y-0.5">
            No. 200 Old Kottawa Road,
            <br />
            Navinna, Maharagama <br />
            Tel: 011 4294 939 <br />
            Mobile: 077 917 7134 <br />
            E-mail: universaltooldepot@gmail.com <br />
            <span className="text-xs block mt-1 font-['UN-Sandhyane'] font-bold">
              නො. 200, පරණ කොට්ටාව පාර, නාවින්න, මහරගම
            </span>
          </p>
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-3 border-t border-dashed border-gray-400 pt-2">
        <h3 className="font-bold text-sm mb-1 underline font-['UN-Sandhyane']">
          පහත සඳහන් කොන්දේසි වලට එකඟ නම් පමණක් උපකරණ ලබාගන්න
        </h3>
        {conditions.length > 0 ?
        <ol className="list-decimal list-inside text-[10px] space-y-0.5 text-black font-['UN-Sandhyane'] font-bold">
            {conditions.map((c) =>
          <li key={c.id}>{c.text}</li>
          )}
          </ol> :

        <p className="text-[10px] text-gray-400 italic">
            Loading conditions...
          </p>
        }
      </div>

      {/* Items Table + Fines Table (joined) */}
      <div className="mb-12">
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black px-2 py-1 text-left font-bold font-['UN-Sandhyane']">
                ලබාගත් උපකරණය
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold font-['UN-Sandhyane']">
                එකක මිල
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold font-['UN-Sandhyane']">
                ඒකක ප්‍රමාණය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold font-['UN-Sandhyane']">
                ලබාගත් දිනය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold font-['UN-Sandhyane']">
                ආපසු ලබාදුන් දිනය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold font-['UN-Sandhyane']">
                තබාගත් දින ගණන
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold font-['UN-Sandhyane']">
                ලබාදුන් වේලාව
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold font-['UN-Sandhyane']">
                මුදල
              </th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => {
              const unitPrice =
              item.type === 'rent' ?
              item.product.rentPricePerDay || 0 :
              item.product.salePrice;
              const days = item.rentalDays || 1;
              const lineTotal =
              item.rentalFee !== undefined ?
              item.rentalFee :
              unitPrice * item.quantity * days;
              const { rupees, cents } = splitPrice(lineTotal);
              return (
                <tr
                  key={index}
                  className={item.status === 'returned' ? 'bg-black-800' : ''}>
                  
                  <td className="border border-black px-2 py-1 font-bold text-black">
                    {item.product.name}
                    {item.status === 'returned' &&
                    <span className="ml-2 text-[10px] text-black-800" style={{ fontWeight: "800" }}>
                        (RETURNED)
                      </span>
                    }
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {formatPrice(unitPrice).replace('Rs. ', '')}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="border border-black px-2 py-1 text-center text-[10px]">
                    {item.borrowedDate || bill.date}
                  </td>
                  <td className="border border-black px-2 py-1 text-center text-[10px]">
                    {item.status === 'returned' ? item.actualReturnDate : ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-bold">
                    {item.status === 'returned' ? days : ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-center text-[10px]">
                    {item.status === 'returned' && item.actualReturnTime ?
                    item.actualReturnTime.slice(0, 5) :
                    ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {rupees}.{cents}
                  </td>
                </tr>);

            })}

            {/* Totals section — joined to table */}
            {hasDiscount &&
            <>
                <tr>
                  <td
                  colSpan={7}
                  className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                  
                    එකතුව
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                    {splitPrice(subtotal).rupees}.{splitPrice(subtotal).cents}
                  </td>
                </tr>
                <tr>
                  <td
                  colSpan={7}
                  className="border border-black px-2 py-1 text-right text-xs">
                  
                    <span className="font-['UN-Sandhyane'] font-bold">
                      වට්ටම
                    </span>{' '}
                    ({formatPercent(discountPercent)}%)
                  </td>
                  <td className="border border-black px-2 py-1 text-right text-xs">
                    -{formatPrice(discountAmount).replace('Rs. ', '')}
                  </td>
                </tr>
              </>
            }
            <tr className="bg-gray-50">
              <td
                colSpan={7}
                className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                
                කුලී එකතුව
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(total).rupees}.{splitPrice(total).cents}
              </td>
            </tr>

            <tr className="bg-gray-50">
              <td
                colSpan={7}
                className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                
                ඇප තැම්පතු මුදල
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(deposit).rupees}.{splitPrice(deposit).cents}
              </td>
            </tr>

            {hasFines &&
            <tr className="bg-gray-50">
                <td
                colSpan={7}
                className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                
                  දඩ මුදල
                </td>
                <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                  {splitPrice(totalFines).rupees}.{splitPrice(totalFines).cents}
                </td>
              </tr>
            }

            <tr className="bg-gray-50">
              <td
                colSpan={7}
                className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                
                මුළු එකතුව
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(netOwed).rupees}.{splitPrice(netOwed).cents}
              </td>
            </tr>

            {(() => {
              const allReturned =
              bill.items.length > 0 &&
              bill.items.every((i) => i.status === 'returned');
              if (refund > 0) {
                if (allReturned) {
                  return (
                    <tr>
                      <td
                        colSpan={7}
                        className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                        
                        ඉතිරිය
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        {splitPrice(refund).rupees}.{splitPrice(refund).cents}
                      </td>
                    </tr>);

                }
                return null;
              } else if (owing > 0) {
                return (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                      
                      ගෙවිය යුතු මුදල
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                      {splitPrice(owing).rupees}.{splitPrice(owing).cents}
                    </td>
                  </tr>);

              } else {
                if (allReturned) {
                  return (
                    <tr>
                      <td
                        colSpan={7}
                        className="border border-black px-2 py-1 text-right font-bold text-xs font-['UN-Sandhyane']">
                        
                        ශේෂය
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        0.00
                      </td>
                    </tr>);

                }
                return null;
              }
            })()}
          </tbody>
        </table>
      </div>

      {/* Signatures & Stamp */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-4">
          <div className="text-center">
            <div className="border-t border-black w-40 mb-1"></div>
            <p className="text-xs font-['UN-Sandhyane'] font-bold">
              පාරිභෝගික අත්සන
            </p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-40 mb-1"></div>
            <p className="text-xs font-['UN-Sandhyane'] font-bold">
              ආයතන නිළධාරී
            </p>
          </div>
        </div>
        {bill.rentalStatus === 'closed' &&
        <div className="text-center mt-6">
            <p className="text-xs mb-2 font-['UN-Sandhyane'] font-bold">
              සියලුම භාණ්ඩ ආපසු ගෙන්වා ඇත.
            </p>
            <div className="inline-block border-2 border-black text-black font-bold text-2xl px-6 py-2 rounded-lg transform -rotate-2 font-['UN-Sandhyane']">
              ගෙවා ඇත
            </div>
          </div>
        }
      </div>
    </div>);

}
export function SaleBillTemplate({ bill }: {bill: Bill;}) {
  const paymentLabel =
  bill.paymentMethod === 'card' ?
  'Card' :
  bill.paymentMethod === 'bank_transfer' ?
  'Bank Transfer' :
  'Cash';
  // Return state is derived from how much of each line item came back
  const totalQty = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedQty = bill.items.reduce(
    (sum, item) => sum + (item.returnedQuantity || 0),
    0
  );
  const isFullyReturned = totalQty > 0 && returnedQty >= totalQty;
  return (
    <div className="p-6 sm:p-8">
      {/* Returned seal — diagonal stamp across the invoice */}
      {returnedQty > 0 &&
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true">
        
          <div
          className={`border-[6px] rounded-2xl px-10 py-4 -rotate-[18deg] text-center opacity-60 ${
          isFullyReturned ?
          'border-red-600 text-red-600' :
          'border-orange-500 text-orange-500'}`
          }>
          
            <p className="text-5xl font-extrabold uppercase tracking-[0.2em] leading-none">
              {isFullyReturned ? 'Returned' : 'Part Returned'}
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.3em] mt-2">
              {returnedQty} of {totalQty} items
            </p>
          </div>
        </div>
      }

      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-6 border-b-2 border-gray-100">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={LOGO_URL}
              alt="Universal Tools"
              className="h-12 w-auto object-contain" />
            
          </div>
          <address className="not-italic text-sm text-gray-600 space-y-1 print-black-text">
            <p>No. 200 Old Kottawa Road, Navinna, Maharagama</p>
            <p>Tel: 011 4294 939 | Mobile: 077 917 7134</p>
            <p>universaltooldepot@gmail.com</p>
          </address>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-200 mb-4 print-black-text">
            INVOICE
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-gray-500 font-medium print-black-text">
                Invoice #:
              </span>
              <span className="font-mono font-bold text-[#1a1a2e] print-black-text">
                {bill.id}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-gray-500 font-medium print-black-text">
                Date:
              </span>
              <span className="font-medium text-[#1a1a2e] print-black-text">
                {bill.date}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-gray-500 font-medium print-black-text">
                Payment:
              </span>
              <span className="font-bold text-[#1a1a2e] print-black-text">
                {paymentLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider print-black-text">
              Item Description
            </th>
            <th className="text-center py-3 text-xs font-bold text-gray-500 uppercase tracking-wider print-black-text">
              Qty
            </th>
            <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider print-black-text">
              Unit Price
            </th>
            <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider print-black-text">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {bill.items.map((item, index) => {
            const unitPrice = item.product.salePrice;
            const lineTotal = unitPrice * item.quantity;
            return (
              <tr key={index} className="border-b border-gray-50">
                <td className="py-4 pr-4">
                  <p className="font-bold text-[#1a1a2e] print-black-text">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-500 print-black-text">
                    {item.product.category}
                  </p>
                  {(item.returnedQuantity || 0) > 0 &&
                  <p className="text-xs font-bold text-red-600 mt-0.5 uppercase tracking-wide">
                      {item.returnedQuantity} returned
                    </p>
                  }
                </td>
                <td className="py-4 text-center font-medium text-gray-700 print-black-text">
                  {item.quantity}
                </td>
                <td className="py-4 text-right text-gray-700 print-black-text">
                  {formatPrice(unitPrice)}
                </td>
                <td className="py-4 text-right font-bold text-[#1a1a2e] print-black-text">
                  {formatPrice(lineTotal)}
                </td>
              </tr>);

          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-600 print-black-text">
            <span>Subtotal</span>
            <span className="font-medium">{formatPrice(bill.subtotal)}</span>
          </div>
          {bill.discountAmount > 0 &&
          <div className="flex justify-between text-sm text-green-600 print-black-text">
              <span>Discount ({formatPercent(bill.discount)}%)</span>
              <span className="font-medium">
                -{formatPrice(bill.discountAmount)}
              </span>
            </div>
          }
          <div className="flex justify-between text-lg font-bold text-[#1a1a2e] border-t-2 border-gray-100 pt-3 print-black-text">
            <span>Total Due</span>
            <span>{formatPrice(bill.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-gray-100 pt-8">
        <p className="font-bold text-[#1a1a2e] mb-2 print-black-text">
          Thank you for your business!
        </p>
        {returnedQty > 0 &&
        <p
          className={`text-xs font-bold uppercase tracking-wider ${
          isFullyReturned ? 'text-red-600' : 'text-orange-600'}`
          }>
          
            {isFullyReturned ?
          'All items on this invoice have been returned.' :
          `${returnedQty} of ${totalQty} items on this invoice have been returned.`}
          </p>
        }
      </div>
    </div>);

}