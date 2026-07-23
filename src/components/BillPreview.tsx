import React from 'react';
import { Bill } from '../types';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { useRentalConditions } from '../hooks/useRentalConditions';
const LOGO_URL = "./WhatsApp_Image_2025-12-13_at_2.34.53_PM.jpg";

interface BillPreviewProps {
  bill: Bill;
  onBack: () => void;
  onNewOrder: () => void;
}
export function BillPreview({ bill, onBack, onNewOrder }: BillPreviewProps) {
  const handlePrint = () => {
    window.print();
  };
  const isRental = bill.items.some((item) => item.type === 'rent');
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center no-print">
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
        className="max-w-[210mm] mx-auto bg-white shadow-lg no-print-shadow min-h-[297mm] relative">
        
        {isRental ?
        <RentalBillTemplate bill={bill} /> :

        <SaleBillTemplate bill={bill} />
        }
      </div>
    </div>);

}
function RentalBillTemplate({ bill }: {bill: Bill;}) {
  const { conditions } = useRentalConditions();
  const subtotal = bill.subtotal;
  const discountPercent = bill.discount;
  const discountAmount = bill.discountAmount;
  const total = bill.total;
  const deposit = bill.deposit || 0;
  // Include fines in refund/owing calculation
  const totalFines = bill.fines?.reduce((s, f) => s + Number(f.fine), 0) || 0;
  const netOwed = total + totalFines;
  const refund = deposit > netOwed ? deposit - netOwed : 0;
  const owing = deposit < netOwed ? netOwed - deposit : 0;
  const isOpen = bill.rentalStatus !== 'closed';
  const hasDiscount = discountPercent > 0;
  const hasFines = bill.fines && bill.fines.length > 0;
  const printedTime = new Date().toLocaleString('en-GB');
  // Map the API/stored payment method to a readable label
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
    <div className="p-8 text-black font-sans text-sm h-full flex flex-col relative">
      {/* Header Section */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <img src={LOGO_URL} alt="Logo" className="h-12 w-auto" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-black">
          Universal Tool Depot
        </h1>
        <p className="text-xs text-gray-600">
          No. 200 Old Kottawa Road, Navinna, Maharagama <br />
          Tel: 011 4294 939 &nbsp;|&nbsp; Mobile: 077 917 7134 <br />
          E-mail: universaltooldepot@gmail.com <br />
          නො. 200, පරණ කොට්ටාව පාර, නාවින්න, මහරගම
        </p>
        <div className="mt-4 font-bold text-sm border-y-2 border-dotted border-gray-400 py-1 inline-block px-4 uppercase">
          උපකරණ නිකුත් කිරීමේ කුවිතාන්සිය
        </div>
      </div>

      {/* Bill & Customer Info Grid */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-xs space-y-1 leading-relaxed">
          <p>
            <span className="inline-block w-32">Bill No:</span>
            <span className="font-bold">{bill.id}</span>
          </p>
          <p>
            <span className="inline-block w-32">Name:</span>
            <span className="font-bold">{bill.customer.name}</span>
          </p>
          <p>
            <span className="inline-block w-32">NIC No:</span>
            <span className="font-bold">{bill.customerNic || '-'}</span>
          </p>
          <p>
            <span className="inline-block w-32">Taken ID:</span>
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
            <span className="inline-block w-32">Mobile No:</span>
            <span className="font-bold">{bill.customer.phone}</span>
          </p>
          <p>
            <span className="inline-block w-32">Payment Method:</span>
            <span className="font-bold">{paymentLabel}</span>
          </p>
        </div>

        <div className="border border-black w-24 h-24 flex items-center justify-center overflow-hidden bg-white">
          {bill.customerPhotoUrl ?
          <img
            src={bill.customerPhotoUrl}
            alt={bill.customer.name}
            className="w-full h-full object-cover" /> :


          <div className="text-center text-gray-400">
              <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              
              </svg>
              <span className="text-[8px]">No Photo</span>
            </div>
          }
        </div>
      </div>

      {/* Conditions */}
      <div className="mb-4 border-t border-dashed border-gray-400 pt-2">
        <h3 className="font-bold text-sm mb-1 underline">
          පහත සඳහන් කොන්දේසි වලට එකඟ නම් පමණක් උපකරණ ලබාගන්න
        </h3>
        {conditions.length > 0 ?
        <ol className="list-decimal list-inside text-[10px] space-y-0.5 text-gray-700">
            {conditions.map((c) =>
          <li key={c.id}>{c.text}</li>
          )}
          </ol> :

        <p className="text-[10px] text-gray-400 italic">
            Loading conditions...
          </p>
        }
      </div>

      {/* Dates & Status */}
      <div className="mb-4 border-t border-dashed border-gray-400 pt-2 text-xs">
        <p>කුලී ආරම්භක දිනය: {bill.date}</p>
        <p>වර්තමාන දිනය: {new Date().toLocaleDateString()}</p>
        <p
          className={`font-bold mt-1 text-sm ${bill.rentalStatus === 'closed' ? 'text-green-600' : 'text-blue-600'}`}>
          
          තත්ත්වය: {bill.items.filter((i) => i.status === 'returned').length}/
          {bill.items.length} භාණ්ඩ ආපසු ගෙන්වා ඇත
        </p>
      </div>

      {/* Items Table + Fines Table (joined) */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black px-2 py-1 text-left font-bold">
                භාණ්ඩ අංකය
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                ලබාගත් උපකරණය
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                එකක මිල
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                ඒකක ප්‍රමාණය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                ලබාගත් දිනය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                ආපසු ලබාදුන් දිනය
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                තබාගත් දින ගණන
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                ලබාදුන් වේලාව
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                රුපියල්
              </th>
              <th className="border border-black px-2 py-1 text-center font-bold">
                ශත
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
                  className={item.status === 'returned' ? 'bg-gray-50' : ''}>
                  
                  <td className="border border-black px-2 py-1 font-mono">
                    {item.product.itemCode || item.product.barcode || '-'}
                  </td>
                  <td className="border border-black px-2 py-1 font-bold text-green-700">
                    {item.product.name}
                    {item.status === 'returned' &&
                    <span className="ml-2 text-[10px] text-gray-500">
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
                    {rupees}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {cents}
                  </td>
                </tr>);

            })}

            {/* Totals section — joined to table */}
            {hasDiscount &&
            <>
                <tr>
                  <td
                  colSpan={8}
                  className="border border-black px-2 py-1 text-right font-bold text-xs">
                  
                    එකතුව
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                    {splitPrice(subtotal).rupees}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                    {splitPrice(subtotal).cents}
                  </td>
                </tr>
                <tr>
                  <td
                  colSpan={8}
                  className="border border-black px-2 py-1 text-right text-xs">
                  
                    වට්ටම ({discountPercent}%)
                  </td>
                  <td
                  colSpan={2}
                  className="border border-black px-2 py-1 text-right text-xs">
                  
                    -{formatPrice(discountAmount).replace('Rs. ', '')}
                  </td>
                </tr>
              </>
            }
            <tr className="bg-gray-50">
              <td
                colSpan={8}
                className="border border-black px-2 py-1 text-right font-bold text-xs">
                
                කුලී එකතුව
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(total).rupees}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(total).cents}
              </td>
            </tr>

            <tr className="bg-gray-50">
              <td
                colSpan={8}
                className="border border-black px-2 py-1 text-right font-bold text-xs">
                
                ඇප තැම්පතු මුදල
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(deposit).rupees}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(deposit).cents}
              </td>
            </tr>

            {hasFines &&
            <tr className="bg-gray-50">
                <td
                colSpan={8}
                className="border border-black px-2 py-1 text-right font-bold text-xs">
                
                  දඩ මුදල
                </td>
                <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                  {splitPrice(totalFines).rupees}
                </td>
                <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                  {splitPrice(totalFines).cents}
                </td>
              </tr>
            }

            <tr className="bg-gray-50">
              <td
                colSpan={8}
                className="border border-black px-2 py-1 text-right font-bold text-xs">
                
                මුළු එකතුව
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(netOwed).rupees}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                {splitPrice(netOwed).cents}
              </td>
            </tr>

            {(() => {
              const allReturned =
              bill.items.length > 0 &&
              bill.items.every((i) => i.status === 'returned');
              if (refund > 0) {
                if (allReturned) {
                  return (
                    <tr className="text-green-700">
                      <td
                        colSpan={8}
                        className="border border-black px-2 py-1 text-right font-bold text-xs">
                        
                        ඉතිරිය
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        {splitPrice(refund).rupees}
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        {splitPrice(refund).cents}
                      </td>
                    </tr>);

                }
                return null;
              } else if (owing > 0) {
                return (
                  <tr className={isOpen ? 'text-red-500' : 'text-red-600'}>
                    <td
                      colSpan={8}
                      className="border border-black px-2 py-1 text-right font-bold text-xs">
                      
                      ගෙවිය යුතු මුදල
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                      {splitPrice(owing).rupees}
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                      {splitPrice(owing).cents}
                    </td>
                  </tr>);

              } else {
                if (allReturned) {
                  return (
                    <tr className="text-green-700">
                      <td
                        colSpan={8}
                        className="border border-black px-2 py-1 text-right font-bold text-xs">
                        
                        ශේෂය
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        0
                      </td>
                      <td className="border border-black px-2 py-1 text-right font-bold text-xs">
                        00
                      </td>
                    </tr>);

                }
                return null;
              }
            })()}

            {isOpen && owing > 0 &&
            <tr>
                <td
                colSpan={10}
                className="border border-black px-2 py-1 text-[10px] text-red-500 font-bold">
                
                  * ගෙවීම් ඉතිරිව ඇත. බිල්පත ක්‍රියාකාරීව පවතී.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-[10px] text-gray-600 mb-12">
        <p>මුද්‍රණය කළ වේලාව: {printedTime}</p>
      </div>

      {/* Signatures & Stamp */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-4">
          <div className="text-center">
            <div className="border-t border-black w-40 mb-1"></div>
            <p className="text-xs">පාරිභෝගික අත්සන</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-40 mb-1"></div>
            <p className="text-xs">ආයතන නිළධාරී</p>
          </div>
        </div>
        {bill.rentalStatus === 'closed' &&
        <div className="text-center mt-6">
            <p className="text-xs mb-2">සියලුම භාණ්ඩ ආපසු ගෙන්වා ඇත.</p>
            <div className="inline-block border-2 border-green-600 text-green-600 font-bold text-2xl px-6 py-2 rounded-lg transform -rotate-2">
              ගෙවා ඇත
            </div>
          </div>
        }
      </div>
    </div>);

}
function SaleBillTemplate({ bill }: {bill: Bill;}) {
  const paymentLabel =
  bill.paymentMethod === 'card' ?
  'Card' :
  bill.paymentMethod === 'bank_transfer' ?
  'Bank Transfer' :
  'Cash';
  return (
    <div className="p-8 sm:p-12">
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-gray-100">
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
      <table className="w-full mb-12">
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
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-gray-600 print-black-text">
            <span>Subtotal</span>
            <span className="font-medium">{formatPrice(bill.subtotal)}</span>
          </div>
          {bill.discount > 0 &&
          <div className="flex justify-between text-sm text-green-600 print-black-text">
              <span>Discount ({bill.discount}%)</span>
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
      </div>
    </div>);

}