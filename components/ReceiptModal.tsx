import React, { useMemo } from 'react';
import { FormSubmission, Shop } from '../types';
import XIcon from './icons/XIcon';
import PrinterIcon from './icons/PrinterIcon';
import CliickLogo from './icons/CliickLogo';
import { useLocalization } from '../hooks/useLocalization';

interface ReceiptModalProps {
    submission: FormSubmission;
    shop: Shop;
    onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ submission, shop, onClose }) => {
    const { t } = useLocalization();
    const receiptConfig = shop.receiptConfig || { showPlatformLogo: true, customFooterText: '', receiptSize: 'standard' };
    
    const shopInfo = useMemo(() => {
        const getInfo = (title: string): string => shop.knowledgeBase.userDefined.find(s => s.title.toLowerCase() === title.toLowerCase())?.content || '';
        const contactContent = getInfo('Contact Info');
        const phoneMatch = contactContent.match(/(?:phone|ph)[:\s]*([\d\s+-]+)/i);
        const emailMatch = contactContent.match(/email[:\s]*([^\s@]+@[^\s@]+\.[^\s@]+)/i);
        const addressLines = contactContent.split('\n').filter(line => 
          !line.toLowerCase().startsWith('phone') &&
          !line.toLowerCase().startsWith('email') &&
          !line.toLowerCase().startsWith('operating hours') &&
          line.trim() !== ''
        );
        const address = addressLines.join(', ');

        return {
            name: getInfo('Business Name') || shop.name,
            address: address,
            phone: phoneMatch ? phoneMatch[1].trim() : '',
            email: emailMatch ? emailMatch[1].trim() : ''
        };
    }, [shop]);
    
    const subtotal = (submission.orderedProducts || []).reduce((total, p) => total + (p.unitPrice * p.quantity), 0);
    const discountAmount = submission.discount?.amount || 0;
    const finalTotal = subtotal - discountAmount;

    const handlePrint = () => {
        window.print();
    };

    const receiptSizeClass = `receipt-${receiptConfig.receiptSize}`;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 printable-receipt-modal">
            <div className="bg-gray-800 text-white w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center no-print">
                    <h3 className="text-lg font-bold">{t('orderReceipt')}</h3>
                    <div className="flex items-center gap-2">
                         <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                            <PrinterIcon className="w-4 h-4" />
                            {t('print')}
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-700">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div id="receipt-content" className="p-4 flex-grow overflow-y-auto">
                    <div className={`receipt-container bg-white text-black p-4 ${receiptSizeClass}`}>
                        {shop.logoUrl && (
                             <div className="text-center mb-4">
                                <img src={shop.logoUrl} alt={`${shopInfo.name} Logo`} className="mx-auto max-h-20 object-contain" />
                            </div>
                        )}
                        <div className="text-center mb-4">
                            <h1 className="text-xl font-bold text-black receipt-header-main">{shopInfo.name}</h1>
                            {shopInfo.address && <p className="text-xs receipt-header-sub">{shopInfo.address}</p>}
                            <p className="text-xs receipt-header-sub">
                                {shopInfo.phone && `Tel: ${shopInfo.phone}`}
                                {shopInfo.phone && shopInfo.email && ` | `}
                                {shopInfo.email && `Email: ${shopInfo.email}`}
                            </p>
                        </div>
                        
                        <div className="text-xs mb-2 pb-2 border-b border-dashed border-gray-400">
                            <p><strong>{t('orderId')}:</strong> {submission.orderId}</p>
                            <p><strong>{t('date')}:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
                        </div>
                        
                        <table className="w-full text-xs text-left mb-2 receipt-items-table">
                            <thead>
                                <tr className="border-b-2 border-dashed border-gray-400">
                                    <th className="py-1 font-semibold text-left">{t('item')}</th>
                                    <th className="py-1 font-semibold text-center">{t('qty')}</th>
                                    <th className="py-1 font-semibold text-right">{t('receiptPrice')}</th>
                                    <th className="py-1 font-semibold text-right">{t('total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(submission.orderedProducts || []).map(item => (
                                    <tr key={item.productId} className="text-black">
                                        <td className="py-1">{item.productName}</td>
                                        <td className="py-1 text-center">{item.quantity}</td>
                                        <td className="py-1 text-right">{item.unitPrice.toLocaleString()}</td>
                                        <td className="py-1 text-right">{(item.unitPrice * item.quantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-xs receipt-totals">
                             <div className="flex justify-between"><span>{t('subtotal')}:</span><span>{subtotal.toLocaleString()} {t('mmk')}</span></div>
                             {submission.discount && discountAmount > 0 && (
                                <div className="flex justify-between">
                                    <span>{t('discount')} ({submission.discount.type === 'percentage' ? `${submission.discount.value}%` : `Fixed`}):</span>
                                    <span>- {discountAmount.toLocaleString()} {t('mmk')}</span>
                                </div>
                             )}
                              <div className="flex justify-between font-bold text-sm pt-1 mt-1 border-t border-gray-400"><span>{t('total')}:</span><span>{finalTotal.toLocaleString()} {t('mmk')}</span></div>
                        </div>

                        <div className="text-center text-xs text-gray-700 mt-4">
                            {receiptConfig.customFooterText ? (
                                <p>{receiptConfig.customFooterText}</p>
                            ) : (
                                 <p>{t('thankYouForPurchase')}</p>
                            )}
                        </div>
                         {receiptConfig.showPlatformLogo && (
                            <div className="flex items-center justify-center gap-1.5 mt-4 pt-2 border-t border-dashed border-gray-300">
                                <p className="text-[9px] text-gray-500">{t('poweredBy')}</p>
                                <CliickLogo className="h-4" textColor="black"/>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;