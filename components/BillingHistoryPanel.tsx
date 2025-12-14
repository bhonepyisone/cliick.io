import React from 'react';
import { Role } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import { useLocalization } from '../hooks/useLocalization';

interface BillingHistoryPanelProps {
    currentUserRole?: Role | null;
}

const BillingHistoryPanel: React.FC<BillingHistoryPanelProps> = ({ currentUserRole }) => {
    const { t } = useLocalization();
    
    // RBAC: Only OWNER can access billing history
    if (currentUserRole !== Role.OWNER && currentUserRole !== null) {
        return (
            <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('billingHistory')}</h2>
                <p className="text-red-400 text-sm">{t('accessDenied')}</p>
                <p className="text-gray-400 text-xs mt-2">Only the shop owner can view billing history.</p>
            </div>
        );
    }

    // Mock data for display purposes
    const mockInvoices = [
        { id: 'inv_12345', date: '2023-10-01', plan: 'Pro Plan', amount: 75000, status: 'Paid' },
        { id: 'inv_12344', date: '2023-09-01', plan: 'Starter Plan', amount: 25000, status: 'Paid' },
        { id: 'inv_12343', date: '2023-08-01', plan: 'Starter Plan', amount: 25000, status: 'Paid' },
    ];

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-[#F6F9FC]">{t('billingHistory')}</h2>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('description')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('amount')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('invoice')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {mockInvoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{invoice.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{invoice.plan}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{invoice.amount.toLocaleString()} MMK</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-700">
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                                            <DownloadIcon className="w-4 h-4" />
                                            {t('download')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {mockInvoices.length === 0 && (
                    <div className="text-center p-8 text-gray-500">
                        {t('noBillingHistory')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingHistoryPanel;