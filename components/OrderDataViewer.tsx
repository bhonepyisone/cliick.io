import React, { useMemo, useState } from 'react';
import { Form, FormSubmission, OrderStatus, Item, Shop, ShopPaymentMethod, SubscriptionPlan, OrderedItem } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import EyeIcon from './icons/EyeIcon';
import XIcon from './icons/XIcon';
import ArrowsUpDownIcon from './icons/ArrowsUpDownIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import OrderEditModal from './OrderEditModal';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import SearchIcon from './icons/SearchIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ReceiptModal from './ReceiptModal';
import PrinterIcon from './icons/PrinterIcon';
import { useLocalization } from '../hooks/useLocalization';
import { getRetentionDays } from '../services/utils';
import { updateOrderStatus as updateOrderStatusInDB } from '../services/supabaseHelpers';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';

interface OrderDataViewerProps {
  submissions: FormSubmission[];
  onSubmissionsChange: (submissions: FormSubmission[]) => void;
  forms: Form[];
  items: Item[];
  paymentMethods: ShopPaymentMethod[];
  shop: Shop;
  showConfirmation: (config: { title: string, message: string, onConfirm: () => void, confirmText?: string }) => void;
}

type SortableKeys = 'Date' | 'Total' | 'status' | 'orderId';

const OrderDataViewer: React.FC<OrderDataViewerProps> = ({ submissions, onSubmissionsChange, forms, items, paymentMethods, shop, showConfirmation }) => {
    const { t } = useLocalization();
    const [selectedFormId, setSelectedFormId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'Date', direction: 'descending' });
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const [editingSubmission, setEditingSubmission] = useState<FormSubmission | null>(null);
    const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<FormSubmission | null>(null);


    const hasConversationalOrders = useMemo(() => submissions.some(s => s.formId === 'conversational_order' || s.formId === 'conversational_booking'), [submissions]);

    const processedSubmissions = useMemo(() => {
        // Apply data retention policy first
        const retentionDays = getRetentionDays(shop.subscription.plan);
        const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const isExtensionActive = shop.subscription.dataHistoryExtension?.status === 'active';

        let filtered = submissions;

        if (!isExtensionActive) {
            filtered = filtered.filter(sub => sub.submittedAt >= retentionCutoff);
        }

        if (selectedFormId !== 'all') {
            if (selectedFormId === 'conversational_order') {
                filtered = filtered.filter(sub => sub.formId === 'conversational_order' || sub.formId === 'conversational_booking');
            } else {
                filtered = filtered.filter(sub => sub.formId === selectedFormId);
            }
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(sub => sub.status === statusFilter);
        }

        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(sub => {
                // Search in orderId, and all string/number values of the submission object
                return Object.values(sub).some(value => 
                    String(value).toLowerCase().includes(lowercasedQuery)
                );
            });
        }
        
        const sorted = [...filtered].sort((a, b) => {
            let aValue: string | number | undefined;
            let bValue: string | number | undefined;

            switch (sortConfig.key) {
                case 'Date':
                    aValue = a.submittedAt;
                    bValue = b.submittedAt;
                    break;
                case 'Total':
                    const aTotal = a.orderedProducts.reduce((acc, p: OrderedItem) => acc + (p.unitPrice * p.quantity), 0);
                    const bTotal = b.orderedProducts.reduce((acc, p: OrderedItem) => acc + (p.unitPrice * p.quantity), 0);
                    aValue = aTotal - (a.discount?.amount || 0);
                    bValue = bTotal - (b.discount?.amount || 0);
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'orderId':
                    aValue = a.orderId;
                    bValue = b.orderId;
                    break;
                default:
                    return 0;
            }

            if (aValue === undefined) aValue = '';
            if (bValue === undefined) bValue = '';

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [submissions, selectedFormId, statusFilter, sortConfig, searchQuery, shop.subscription]);

    const customFieldHeaders = useMemo(() => {
        const headers = new Set<string>();
        processedSubmissions.forEach(sub => {
            Object.keys(sub).forEach(key => {
                if (!['submissionId', 'orderId', 'submittedAt', 'formId', 'formName', 'status', 'orderedProducts', 'paymentMethod', 'paymentScreenshotUrl', 'discount'].includes(key)) {
                    headers.add(key);
                }
            });
        });
        return Array.from(headers);
    }, [processedSubmissions]);


  const handleStatusChange = async (submissionId: string, newStatus: OrderStatus) => {
    const submissionToUpdate = submissions.find(sub => sub.submissionId === submissionId);
    if (!submissionToUpdate) return;

    const isWithin24Hours = (Date.now() - submissionToUpdate.submittedAt) < (24 * 60 * 60 * 1000);
    
    let notificationMessage = '';
    
    if (isWithin24Hours) {
        const customerNameKey = Object.keys(submissionToUpdate).find(k => k.toLowerCase().includes('name'));
        const customerName = customerNameKey ? submissionToUpdate[customerNameKey] : 'Customer';

        const productsString = submissionToUpdate.orderedProducts.map(p => `${p.productName} (x${p.quantity})`).join(', ');
        const total = submissionToUpdate.orderedProducts.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0).toLocaleString();

        switch(newStatus) {
            case OrderStatus.Confirmed:
                notificationMessage = `Hi ${customerName}, your order (${submissionToUpdate.orderId}) for ${productsString} (Total: ${total} MMK) has been confirmed! We'll let you know when it ships.`;
                break;
            case OrderStatus.Completed:
                notificationMessage = `Great news, ${customerName}! Your order (${submissionToUpdate.orderId}) for ${productsString} has been completed and is on its way.`;
                break;
            case OrderStatus.Cancelled:
                notificationMessage = `Hi ${customerName}, we're sorry to inform you that your order (${submissionToUpdate.orderId}) for ${productsString} has been cancelled. Please contact us if you have any questions.`;
                break;
            default:
                notificationMessage = '';
        }

        if (notificationMessage) {
            alert(`${t('statusUpdated', { newStatus })}\n\n${t('simulatedNotification', { message: notificationMessage })}`);
        } else {
             alert(t('statusUpdated', { newStatus }));
        }
    } else {
        alert(`${t('statusUpdated', { newStatus })}\nNote: A notification was not sent because the order is older than 24 hours.`);
    }

    // Update in Supabase database
    try {
        await updateOrderStatusInDB(submissionId, newStatus);
        logger.info(`Order ${submissionId} status updated to ${newStatus}`);
        showToast.success('Order status updated successfully');
        
        // Update local state (real-time subscription will also update, but this provides immediate feedback)
        const updatedSubmissions = submissions.map(sub => 
          sub.submissionId === submissionId ? { ...sub, status: newStatus } : sub
        );
        onSubmissionsChange(updatedSubmissions);
    } catch (error: any) {
        logger.error('Failed to update order status in database', error);
        showToast.error('Failed to update order status. Please try again.');
    }
  };

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
        return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 ml-2" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUpIcon className="w-4 h-4 text-white ml-2" />;
    }
    return <ArrowDownIcon className="w-4 h-4 text-white ml-2" />;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.Pending: return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case OrderStatus.Confirmed: return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case OrderStatus.Completed: return 'bg-green-900/50 text-green-300 border-green-700';
      case OrderStatus.Cancelled: return 'bg-red-900/50 text-red-300 border-red-700';
      case OrderStatus.Return: return 'bg-orange-900/50 text-orange-300 border-orange-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  const handleDeleteSubmission = (submissionId: string) => {
    const submissionToDelete = submissions.find(s => s.submissionId === submissionId);
    if (!submissionToDelete) return;

    showConfirmation({
        title: t('deleteOrder'),
        message: t('areYouSureDeleteOrder', { orderId: submissionToDelete.orderId || submissionToDelete.submissionId }),
        confirmText: t('delete'),
        onConfirm: () => {
            const updatedSubmissions = submissions.filter(s => s.submissionId !== submissionId);
            onSubmissionsChange(updatedSubmissions);
        }
    });
  };

  const handleSaveSubmission = (updatedSubmission: FormSubmission) => {
      onSubmissionsChange(submissions.map(s => s.submissionId === updatedSubmission.submissionId ? updatedSubmission : s));
      setEditingSubmission(null);
  };
  
   const handleExportToCsv = () => {
        if (processedSubmissions.length === 0) {
            alert("There is no data to export for the selected filter.");
            return;
        }

        const baseHeaders = ['Order ID', 'Date', 'Form Name', 'Status', 'Total (MMK)', 'Products', 'Payment Method'];
        const allHeaders = [...baseHeaders, ...customFieldHeaders];

        const formatCsvField = (value: any): string => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = str.replace(/"/g, '""');
                return `"${str}"`;
            }
            return str;
        };

        const csvRows = processedSubmissions.map(sub => {
            const orderTotal = sub.orderedProducts.reduce((acc, p: OrderedItem) => acc + (p.unitPrice * p.quantity), 0) - (sub.discount?.amount || 0);
            const productsString = sub.orderedProducts.map(p => `${p.productName} (x${p.quantity})`).join('; ');
            
            const baseRow = [
                sub.orderId || 'N/A',
                new Date(sub.submittedAt).toLocaleString(),
                sub.formName,
                sub.status,
                orderTotal,
                productsString,
                sub.paymentMethod || 'N/A'
            ];

            const customRow = customFieldHeaders.map(header => sub[header] || '');
            return [...baseRow, ...customRow].map(formatCsvField).join(',');
        });

        const csvContent = [allHeaders.join(','), ...csvRows].join('\r\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `order_data_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopyOrderId = (orderId: string | undefined) => {
        if (!orderId) return;
        navigator.clipboard.writeText(orderId).then(() => {
            setCopiedOrderId(orderId);
            setTimeout(() => setCopiedOrderId(null), 2000);
        });
    };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg h-full overflow-y-auto p-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-700 pb-6 mb-6">
        <div>
            <h2 className="text-xl font-bold text-white">{t('orderData')}</h2>
            <p className="text-sm text-gray-400">{t('viewAndManageOrders')}</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder={t('searchOrders')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md py-2 pl-9 pr-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-full md:w-auto"
                />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="form-filter" className="text-sm text-gray-400">{t('form')}</label>
                <select
                    id="form-filter"
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="all">{t('allForms')}</option>
                    {forms.map(form => (
                        <option key={form.id} value={form.id}>{form.name}</option>
                    ))}
                    {hasConversationalOrders && (
                        <option value="conversational_order">{t('conversationalOrders')}</option>
                    )}
                </select>
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-sm text-gray-400">{t('status')}</label>
                <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    <option value="all">{t('allStatuses')}</option>
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <button 
                onClick={handleExportToCsv}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={processedSubmissions.length === 0}
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                {t('downloadCSV')}
            </button>
        </div>
      </div>

      <div>
        {processedSubmissions.length === 0 ? (
            <div className="text-center text-gray-400 flex items-center justify-center py-16">
                <p>{t('noMatchingOrders')}</p>
            </div>
        ) : (
            <div className="w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900/50">
                        <tr>
                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                <button className="flex items-center" onClick={() => requestSort('orderId')}>
                                    {t('orderId')} {getSortIcon('orderId')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                <button className="flex items-center" onClick={() => requestSort('Date')}>
                                    {t('date')} {getSortIcon('Date')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('form')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('items')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                <button className="flex items-center" onClick={() => requestSort('Total')}>
                                    {t('total')} {getSortIcon('Total')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                 <button className="flex items-center" onClick={() => requestSort('status')}>
                                    {t('status')} {getSortIcon('status')}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('payment')}</th>
                            {customFieldHeaders.map(header => (
                                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{header}</th>
                            ))}
                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {processedSubmissions.map(sub => {
                           const isBooking = sub.formName.toLowerCase().includes('booking');
                           const subtotal = sub.orderedProducts.reduce((acc, p: OrderedItem) => acc + (p.unitPrice * p.quantity), 0);
                           const orderTotal = subtotal - (sub.discount?.amount || 0);
                           return (
                            <tr key={sub.submissionId} className={`group hover:bg-gray-700/50 transition-colors ${sub.status === OrderStatus.Cancelled ? 'opacity-60' : ''}`}>
                                <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <span className={sub.status === OrderStatus.Cancelled ? 'line-through' : ''}>
                                            {isBooking && 'BK-'}
                                            {sub.orderId || 'N/A'}
                                        </span>
                                        {sub.orderId && (
                                            <button 
                                                onClick={() => handleCopyOrderId(sub.orderId)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity"
                                                title={t('copyOrderId')}
                                            >
                                                {copiedOrderId === sub.orderId ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <ClipboardIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-300">{sub.formName}</td>
                                <td className="px-4 py-4 text-xs text-gray-200 max-w-xs">
                                  {isBooking 
                                    ? <div className="truncate">{sub.orderedProducts[0]?.productName}</div>
                                    : sub.orderedProducts.map(p => <div key={p.productId} className="truncate">{`${p.productName} (x${p.quantity})`}</div>)
                                  }
                                  {sub.orderedProducts.length === 0 && !isBooking && <span className="text-gray-500">{t('noProducts')}</span>}
                                  {sub.orderedProducts.length === 0 && isBooking && <span className="text-gray-500">{t('noService')}</span>}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs text-blue-400 font-semibold">{orderTotal.toLocaleString()} {t('mmk')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-xs">
                                  <select value={sub.status} onChange={(e) => handleStatusChange(sub.submissionId, e.target.value as OrderStatus)} className={`rounded-md p-1.5 border text-xs ${getStatusColor(sub.status)}`}>
                                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                 <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <span>{sub.paymentMethod || 'N/A'}</span>
                                        {sub.paymentScreenshotUrl && (
                                            <button
                                                onClick={() => setViewingImageUrl(sub.paymentScreenshotUrl!)}
                                                className="group relative"
                                                aria-label={t('viewPaymentProof')}
                                            >
                                                <img
                                                    src={sub.paymentScreenshotUrl}
                                                    alt="Payment proof thumbnail"
                                                    className="w-8 h-8 object-cover rounded-md border border-gray-600 transition-transform group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                                    <EyeIcon className="w-4 h-4 text-white" />
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                {customFieldHeaders.map(header => {
                                    const isBookingField = header.toLowerCase().includes('appointment');
                                    const shouldShow = (isBooking && isBookingField) || (!isBooking && !isBookingField);
                                    return (
                                        <td key={header} className="px-4 py-4 whitespace-nowrap text-xs text-gray-300">
                                            {shouldShow ? String(sub[header] || '') : <span className="text-gray-600">-</span>}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-4 whitespace-nowrap text-xs">
                                    <div className="flex items-center gap-2">
                                        {sub.status === OrderStatus.Completed && (
                                            <button onClick={() => setViewingReceipt(sub)} className="p-1 text-gray-400 hover:text-blue-400" title={t('viewReceipt')}><PrinterIcon className="w-4 h-4"/></button>
                                        )}
                                        <button onClick={() => setEditingSubmission(sub)} className="p-1 text-gray-400 hover:text-blue-400" title={t('editOrder')}><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteSubmission(sub.submissionId)} className="p-1 text-gray-400 hover:text-red-400" title={t('deleteOrder')}><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                           );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

        {viewingImageUrl && (
            <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in-fast"
                onClick={() => setViewingImageUrl(null)}
                role="dialog"
                aria-modal="true"
            >
                <div className="relative max-w-4xl max-h-[90vh]">
                    <img
                        src={viewingImageUrl}
                        alt={t('enlargedPaymentProof')}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setViewingImageUrl(null)}
                        className="absolute -top-3 -right-3 bg-gray-800 rounded-full p-2 text-white hover:bg-gray-700 transition-colors"
                        aria-label={t('closeImageViewer')}
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        )}
        
        {editingSubmission && (
            <OrderEditModal
                submission={editingSubmission}
                onClose={() => setEditingSubmission(null)}
                onSave={handleSaveSubmission}
                products={items}
                paymentMethods={paymentMethods}
            />
        )}
        
        {viewingReceipt && (
            <ReceiptModal
                submission={viewingReceipt}
                shop={shop}
                onClose={() => setViewingReceipt(null)}
            />
        )}
        
        <style>{`
            @keyframes fade-in-fast { 
                from { opacity: 0; transform: scale(0.95); } 
                to { opacity: 1; transform: scale(1); } 
            }
            .animate-fade-in-fast { 
                animation: fade-in-fast 0.2s ease-out forwards; 
            }
        `}</style>
    </div>
  );
};

export default OrderDataViewer;
