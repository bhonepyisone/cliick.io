import React, { useState, useMemo } from 'react';
import { Shop, OrderStatus, SubscriptionPlan, Item } from '../types';
import api from '../services/apiService';
import ReactMarkdown from 'react-markdown';

import DollarSignIcon from './icons/DollarSignIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import BoxIcon from './icons/BoxIcon';
import TrendingUpIcon from './icons/TrendingUpIcon';
import TrendingDownIcon from './icons/TrendingDownIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SparklesIcon from './icons/SparklesIcon';
import PackageIcon from './icons/PackageIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ClockIcon from './icons/ClockIcon';
import XCircleIcon from './icons/XCircleIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';
import PercentIcon from './icons/PercentIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import ArrowsUpDownIcon from './icons/ArrowsUpDownIcon';
import InfoIcon from './icons/InfoIcon';
import { useLocalization } from '../hooks/useLocalization';
import { usePermissions } from '../hooks/usePermissions';


interface SalesDashboardProps {
  shop: Shop;
  permissions: ReturnType<typeof usePermissions>;
  onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
}

const getRetentionDays = (plan: SubscriptionPlan | undefined): number => {
    switch (plan) {
        case 'Starter': return 90;
        case 'Brand': return 180; // 6 months
        case 'Pro':
        case 'Trial': return 450; // 15 months
        default: return 90;
    }
};

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string; valueClass?: string }> = ({ title, value, icon, subtext, valueClass = "text-white" }) => (
    <div className="bg-[#1D3B59] p-6 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0">{icon}</div>
            <h3 className="text-sm text-gray-400 font-medium">{title}</h3>
        </div>
        <p className={`text-4xl font-bold mt-4 truncate ${valueClass}`} title={String(value)}>
            {value}
        </p>
        {subtext && <p className="text-sm text-gray-400 mt-1">{subtext}</p>}
    </div>
);


const StatusCard: React.FC<{ title: string; value: number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4">
        <div className="flex-shrink-0">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{title}</p>
        </div>
    </div>
);


const DetailedListCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-gray-800 p-6 rounded-lg h-full max-h-[450px] flex flex-col">
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            {icon}
            <h4 className="font-semibold text-gray-200">{title}</h4>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
            {children}
        </div>
    </div>
);

const toISODateString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

type SkuSortKeys = 'skuName' | 'unitsSold' | 'revenue' | 'asp' | 'profitMargin' | 'returnRate' | 'invRem' | 'sellThru' | 'saleSpeed' | 'trend';

const SalesDashboard: React.FC<SalesDashboardProps> = ({ shop, permissions, onUpdateShop }) => {
    const { t } = useLocalization();
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29); // 30 days including today
        return d;
    });
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isCategoryAnalysisOpen, setIsCategoryAnalysisOpen] = useState(true);
    const [isSkuPerformanceOpen, setIsSkuPerformanceOpen] = useState(true);
    const [skuSortConfig, setSkuSortConfig] = useState<{ key: SkuSortKeys; direction: 'ascending' | 'descending' }>({ key: 'revenue', direction: 'descending' });

    const canViewAdvanced = permissions.can('advancedDashboards');
    const { remaining: suggestionCredits, limit: suggestionLimit } = permissions.getRemainingCredits('shopDashboardSuggestion');

    const filteredSubmissions = useMemo(() => {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        const retentionDays = getRetentionDays(shop.subscription.plan);
        const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const isExtensionActive = shop.subscription.dataHistoryExtension?.status === 'active';

        return shop.formSubmissions.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            const isInDateRange = subDate >= startOfDay && subDate <= endOfDay;
            const isWithinRetention = isExtensionActive || sub.submittedAt >= retentionCutoff;
            return isInDateRange && isWithinRetention;
        });
    }, [shop.formSubmissions, startDate, endDate, shop.subscription]);

    const salesKpis = useMemo(() => {
        let revenue = 0;
        let totalProfit = 0;
        let itemsSold = 0;
        
        const completedSubs = filteredSubmissions.filter(s => s.status === OrderStatus.Completed);
        const returnedSubs = filteredSubmissions.filter(s => s.status === 'Return');

        completedSubs.forEach(sub => {
            sub.orderedProducts.forEach(item => {
                const orderItemRevenue = item.unitPrice * item.quantity;
                revenue += orderItemRevenue;
                itemsSold += item.quantity;

                const productDetails = shop.items.find(p => p.id === item.productId);
                if (productDetails && productDetails.itemType === 'product' && productDetails.originalPrice) {
                    const costOfGoods = productDetails.originalPrice * item.quantity;
                    totalProfit += (orderItemRevenue - costOfGoods);
                }
            });
        });

        returnedSubs.forEach(sub => {
            sub.orderedProducts.forEach(item => {
                const returnedItemRevenue = item.unitPrice * item.quantity;
                revenue -= returnedItemRevenue; // Subtract returns from revenue
                
                const productDetails = shop.items.find(p => p.id === item.productId);
                if (productDetails && productDetails.itemType === 'product' && productDetails.originalPrice) {
                    const costOfGoods = productDetails.originalPrice * item.quantity;
                    totalProfit -= (returnedItemRevenue - costOfGoods);
                }
            });
        });
        
        const averageProfitMargin = revenue > 0 ? (totalProfit / revenue) * 100 : 0;
        const averageOrderValue = completedSubs.length > 0 ? revenue / completedSubs.length : 0;
        const totalOrders = filteredSubmissions.length;
        
        return { revenue, netProfit: totalProfit, averageProfitMargin, orders: totalOrders, averageOrderValue, itemsSold };
    }, [filteredSubmissions, shop.items]);
    
     const inventoryMetrics = useMemo(() => {
        const productItems = shop.items.filter(i => i.itemType === 'product');
        const totalStock = productItems.reduce((acc, p) => acc + p.stock, 0);
        const totalInvestment = productItems.reduce((acc, p) => acc + (p.originalPrice || 0) * p.stock, 0);
        const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        const avgSaleSpeed = salesKpis.itemsSold > 0 ? daysInPeriod / salesKpis.itemsSold : 0;

        return { totalStock, totalInvestment, avgSaleSpeed };
    }, [shop.items, salesKpis, startDate, endDate]);

     const categoryMetrics = useMemo(() => {
        const revenueByCategory: { [key: string]: { revenue: number, units: number } } = {};
        const inventoryByCategory: { [key: string]: number } = {};
        const profitByCategory: { [key: string]: { profit: number, revenue: number } } = {};

        const validSubs = filteredSubmissions.filter(s => s.status === OrderStatus.Completed);

        for (const sub of validSubs) {
            for (const item of sub.orderedProducts) {
                const product = shop.items.find(p => p.id === item.productId);
                if (!product || !product.category) continue;
                const category = product.category;

                if (!revenueByCategory[category]) revenueByCategory[category] = { revenue: 0, units: 0 };
                revenueByCategory[category].revenue += item.unitPrice * item.quantity;
                revenueByCategory[category].units += item.quantity;
                
                if (product.itemType === 'product' && product.originalPrice) {
                    if (!profitByCategory[category]) profitByCategory[category] = { profit: 0, revenue: 0 };
                    const profit = (item.unitPrice - product.originalPrice) * item.quantity;
                    profitByCategory[category].profit += profit;
                    profitByCategory[category].revenue += item.unitPrice * item.quantity;
                }
            }
        }
        
        for (const product of shop.items.filter(i => i.itemType === 'product')) {
            if (!product.category) continue;
            if (!inventoryByCategory[product.category]) inventoryByCategory[product.category] = 0;
            inventoryByCategory[product.category] += product.stock;
        }

        const profitMarginByCategory: { [key: string]: number } = {};
        for (const cat in profitByCategory) {
            profitMarginByCategory[cat] = profitByCategory[cat].revenue > 0 ? (profitByCategory[cat].profit / profitByCategory[cat].revenue) * 100 : 0;
        }

        const allCategories = new Set([...Object.keys(revenueByCategory), ...Object.keys(inventoryByCategory)]);
        allCategories.forEach(cat => {
            if(!revenueByCategory[cat]) revenueByCategory[cat] = { revenue: 0, units: 0 };
        });

        const sortedRevenue = Object.entries(revenueByCategory).sort(([, a], [, b]) => b.revenue - a.revenue);
        const sortedInventory = Object.entries(inventoryByCategory).sort(([, a], [, b]) => b - a);
        const sortedProfitMargin = Object.entries(profitMarginByCategory).sort(([, a], [, b]) => b - a);

        return {
            revenue: sortedRevenue,
            inventory: sortedInventory,
            profitMargin: sortedProfitMargin,
            totalRevenue: salesKpis.revenue,
        };
    }, [filteredSubmissions, shop.items, salesKpis.revenue]);

    const skuPerformanceData = useMemo(() => {
        const productItems = shop.items.filter(i => i.itemType === 'product');
        const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        
        // Previous period calculation
        const duration = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - duration);

        const prevPeriodSubmissions = shop.formSubmissions.filter(sub => {
            const subDate = new Date(sub.submittedAt);
            return subDate >= prevStartDate && subDate <= prevEndDate;
        });

        const data = productItems.map(product => {
            const sales = filteredSubmissions
                .flatMap(sub => (sub.status === OrderStatus.Completed) ? sub.orderedProducts.filter(p => p.productId === product.id) : []);
            const returns = filteredSubmissions
                .flatMap(sub => (sub.status === 'Return') ? sub.orderedProducts.filter(p => p.productId === product.id) : []);

            const unitsSold = sales.reduce((acc, item) => acc + item.quantity, 0);
            const unitsReturned = returns.reduce((acc, item) => acc + item.quantity, 0);
            const revenue = sales.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
            const asp = unitsSold > 0 ? revenue / unitsSold : 0;
            const costOfGoods = (product.originalPrice || 0) * unitsSold;
            const profit = revenue - costOfGoods;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
            const returnRate = (unitsSold + unitsReturned) > 0 ? (unitsReturned / (unitsSold + unitsReturned)) * 100 : 0;
            const invRem = product.stock;
            const sellThru = (unitsSold + invRem) > 0 ? (unitsSold / (unitsSold + invRem)) * 100 : 0;
            const saleSpeed = unitsSold > 0 ? daysInPeriod / unitsSold : Infinity;

            // Trend Calculation
            const prevSales = prevPeriodSubmissions
                .flatMap(sub => (sub.status === OrderStatus.Completed) ? sub.orderedProducts.filter(p => p.productId === product.id) : []);
            const prevUnitsSold = prevSales.reduce((acc, item) => acc + item.quantity, 0);

            let trend: number;
            if (prevUnitsSold > 0) {
                trend = ((unitsSold - prevUnitsSold) / prevUnitsSold) * 100;
            } else if (unitsSold > 0) {
                trend = Infinity; // New sales for a product that had none
            } else {
                trend = 0; // No sales in either period
            }

            return { ...product, skuName: product.name, unitsSold, revenue, asp, profitMargin, returnRate, invRem, sellThru, trend, saleSpeed };
        });

        data.sort((a, b) => {
            const key = skuSortConfig.key;
            let aVal = a[key], bVal = b[key];
            if (key === 'saleSpeed' || key === 'trend') { 
                aVal = aVal === Infinity ? 999999 : aVal; 
                bVal = bVal === Infinity ? 999999 : bVal; 
            }
            if (typeof aVal === 'string' && typeof bVal === 'string') return skuSortConfig.direction === 'ascending' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            const numA = Number(aVal), numB = Number(bVal);
            if (numA < numB) return skuSortConfig.direction === 'ascending' ? -1 : 1;
            if (numA > numB) return skuSortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return data;
    }, [shop.items, filteredSubmissions, shop.formSubmissions, startDate, endDate, skuSortConfig]);

    const requestSkuSort = (key: SkuSortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (skuSortConfig.key === key && skuSortConfig.direction === 'ascending') { direction = 'descending'; }
        setSkuSortConfig({ key, direction });
    };

    const GetSortIcon: React.FC<{ sortKey: SkuSortKeys }> = ({ sortKey }) => {
        if (skuSortConfig.key !== sortKey) return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 opacity-50" />;
        return skuSortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-4 h-4 text-white" /> : <ArrowDownIcon className="w-4 h-4 text-white" />;
    };

    const { bestSellers, slowMovers, lowStockProducts } = useMemo(() => {
        const productItems = shop.items.filter(i => i.itemType === 'product');
        const productSales = new Map<string, { name: string; quantity: number; productId: string; }>();
        const validSubmissions = filteredSubmissions.filter(s => s.status === OrderStatus.Completed);
        for (const sub of validSubmissions) {
            for (const item of sub.orderedProducts) {
                const existing = productSales.get(item.productId) || { name: item.productName, quantity: 0, productId: item.productId };
                existing.quantity += item.quantity;
                productSales.set(item.productId, existing);
            }
        }
        const allSoldProducts = Array.from(productSales.values());
        const bestSellers = [...allSoldProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        const soldProductIds = new Set(productSales.keys());
        const slowMovers = productItems.filter(p => !soldProductIds.has(p.id) && p.stock > 0).slice(0, 5);
        const lowStockProducts = productItems.filter(p => p.stock > 0 && p.stock < 10).sort((a, b) => a.stock - b.stock).slice(0, 5);
        return { bestSellers, slowMovers, lowStockProducts };
    }, [filteredSubmissions, shop.items]);
    
    const statusCounts = useMemo(() => {
        const counts = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0, Return: 0 };
        filteredSubmissions.forEach(sub => { if (sub.status in counts) counts[sub.status as keyof typeof counts]++; });
        return counts;
    }, [filteredSubmissions]);

    const handleGenerateSuggestion = async () => {
        if (suggestionCredits !== null && suggestionCredits <= 0) {
            setAiSuggestion('You have no more credits for this feature this month.');
            return;
        }

        setIsGeneratingSuggestion(true);
        setAiSuggestion('');
        const prompt = `Analyze the following sales and inventory data for an online shop for the period ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.
            **Key Metrics:** - Total Revenue (from Completed orders): ${salesKpis.revenue.toLocaleString()} MMK, - Total Orders (all statuses): ${salesKpis.orders}
            **Best Selling Items (by units sold):** ${bestSellers.length > 0 ? bestSellers.map(p => `- ${p.name}: ${p.quantity} units`).join('\n') : 'None'}
            **Slow Moving Items (no sales in this period):** ${slowMovers.length > 0 ? slowMovers.map(p => `- ${p.name} (Stock: ${p.stock})`).join('\n') : 'None'}
            **Low Stock Items (less than 10 units):** ${lowStockProducts.length > 0 ? lowStockProducts.map(p => `- ${p.name} (Stock: ${p.stock})`).join('\n') : 'None'}
            Based on this data, provide a concise list of 3-5 actionable suggestions for the shop owner to improve sales and manage inventory. Use markdown for your response.`;
        try { 
            const suggestion = await api.generateShopSuggestion(prompt); 
            setAiSuggestion(suggestion); 
            onUpdateShop(permissions.consumeCredit('shopDashboardSuggestion'));
        } 
        catch (error) { console.error(error); setAiSuggestion('Sorry, I was unable to generate suggestions at this time.'); } 
        finally { setIsGeneratingSuggestion(false); }
    };

    const renderTrend = (trend: number) => {
        if (trend === Infinity) return <span className="text-blue-400 font-semibold">New</span>;
        if (trend === 0 && !isNaN(trend)) return <span className="text-gray-400">0%</span>;
        const color = trend > 0 ? 'text-green-400' : 'text-red-400';
        const icon = trend > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />;
        return <span className={`flex items-center gap-1 font-semibold ${color}`}>{icon} {trend.toFixed(1)}%</span>;
    };

    const SkuTableHeader: React.FC<{ sortKey: SkuSortKeys; title: string; tooltip: string; }> = ({ sortKey, title, tooltip }) => (
        <th className="py-3 px-4 font-medium">
            <button onClick={() => requestSkuSort(sortKey)} className="flex items-center gap-1.5 group relative">
                {title}
                <GetSortIcon sortKey={sortKey} />
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-20 whitespace-pre-line text-left">
                    <InfoIcon className="w-3 h-3 inline mr-1" />{tooltip}
                </div>
            </button>
        </th>
    );

    return (
        <div className="bg-[#0A2540] rounded-lg flex flex-col p-6 h-full overflow-y-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">{t('salesDashboard')}</h2>
                    <p className="text-md text-gray-400">{t('salesDashboardOverview')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <label htmlFor="start-date" className="text-sm text-gray-400">{t('from')}</label>
                    <input type="date" id="start-date" value={toISODateString(startDate)} onChange={e => setStartDate(new Date(e.target.value))} className="bg-[#1D3B59] border border-gray-700 rounded-md p-2 text-sm text-white"/>
                    <label htmlFor="end-date" className="text-sm text-gray-400">{t('to')}</label>
                    <input type="date" id="end-date" value={toISODateString(endDate)} onChange={e => setEndDate(new Date(e.target.value))} className="bg-[#1D3B59] border border-gray-700 rounded-md p-2 text-sm text-white"/>
                </div>
            </header>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title={t('netRevenue')} value={`${salesKpis.revenue.toLocaleString()}`} icon={<DollarSignIcon className="w-6 h-6 text-green-400"/>} subtext={t('completedMinusReturns')} />
                <KpiCard title={t('netProfit')} value={`${salesKpis.netProfit.toLocaleString()}`} icon={<TrendingUpIcon className="w-6 h-6 text-green-400"/>} subtext={t('mmk')} />
                <KpiCard title={t('avgProfitMargin')} value={`${salesKpis.averageProfitMargin.toFixed(1)}%`} icon={<PercentIcon className="w-6 h-6 text-indigo-400"/>} />
                <KpiCard title={t('totalOrders')} value={salesKpis.orders} icon={<ShoppingCartIcon className="w-6 h-6 text-blue-400"/>} subtext={t('allStatuses')} />
            </section>
            
            <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <StatusCard title={t('statusPending')} value={statusCounts.Pending} icon={<ClockIcon className="w-6 h-6 text-yellow-400"/>} />
                <StatusCard title={t('statusConfirmed')} value={statusCounts.Confirmed} icon={<CheckCircleIcon className="w-6 h-6 text-blue-400"/>} />
                <StatusCard title={t('statusCompleted')} value={statusCounts.Completed} icon={<PackageIcon className="w-6 h-6 text-green-400"/>} />
                <StatusCard title={t('statusCancelled')} value={statusCounts.Cancelled} icon={<XCircleIcon className="w-6 h-6 text-red-400"/>} />
                <StatusCard title={t('statusReturn')} value={statusCounts.Return} icon={<RefreshCwIcon className="w-6 h-6 text-orange-400"/>} />
            </section>

            {canViewAdvanced ? (
                <>
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">{t('inventoryAnalysis')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <KpiCard title={t('totalInventoryItems')} value={inventoryMetrics.totalStock.toLocaleString()} icon={<PackageIcon className="w-6 h-6 text-cyan-400"/>} />
                            <KpiCard title={t('totalInventoryInvestment')} value={inventoryMetrics.totalInvestment.toLocaleString()} icon={<DollarSignIcon className="w-6 h-6 text-green-400"/>} subtext={t('basedOnBuyingPrice')} />
                            <KpiCard title={t('avgSaleSpeed')} value={inventoryMetrics.avgSaleSpeed > 0 ? `~${inventoryMetrics.avgSaleSpeed.toFixed(1)}${t('dPerUnit')}` : 'N/A'} icon={<ClockIcon className="w-6 h-6 text-blue-400"/>} />
                        </div>
                    </section>

                    <section className="bg-[#1D3B59] p-6 rounded-lg">
                        <button onClick={() => setIsCategoryAnalysisOpen(!isCategoryAnalysisOpen)} className="w-full flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{t('categoryAnalysis')}</h2>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform ${isCategoryAnalysisOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isCategoryAnalysisOpen && (
                            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div>
                                    <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5"/> {t('revenueByCategory')}</h4>
                                    <div className="space-y-3 text-sm">
                                        {categoryMetrics.revenue.map(([name, data]) => (
                                            <div key={name}>
                                                <div className="flex justify-between mb-1"><span>{name}</span> <span>{data.revenue.toLocaleString()} {t('mmk')} ({data.units} {t('units')})</span></div>
                                                <div className="w-full bg-gray-700 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: `${(data.revenue / (categoryMetrics.totalRevenue || 1)) * 100}%`}}></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                     <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><BoxIcon className="w-5 h-5"/> {t('inventoryByCategory')}</h4>
                                     <div className="space-y-2 text-sm">
                                        {categoryMetrics.inventory.map(([name, units]) => ( <div key={name} className="flex justify-between items-center"><span>{name}</span><span className="font-semibold text-blue-300">{units} {t('units')}</span></div> ))}
                                     </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><PercentIcon className="w-5 h-5"/> {t('profitMarginByCategory')}</h4>
                                    <div className="space-y-2 text-sm">
                                        {categoryMetrics.profitMargin.map(([name, margin]) => ( <div key={name} className="flex justify-between items-center"><span>{name}</span><span className="font-semibold text-green-400">{margin.toFixed(1)}%</span></div> ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                    
                    <section className="bg-[#1D3B59] p-6 rounded-lg">
                        <button onClick={() => setIsSkuPerformanceOpen(!isSkuPerformanceOpen)} className="w-full flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{t('skuPerformance')}</h2>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform ${isSkuPerformanceOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isSkuPerformanceOpen && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-gray-600 text-xs text-gray-400 uppercase">
                                            <SkuTableHeader sortKey="skuName" title={t('skuName')} tooltip={t('skuNameTooltip')} />
                                            <SkuTableHeader sortKey="unitsSold" title={t('unitsSold')} tooltip={t('unitsSoldTooltip')} />
                                            <SkuTableHeader sortKey="revenue" title={t('revenue')} tooltip={t('revenueTooltip')} />
                                            <SkuTableHeader sortKey="asp" title={t('asp')} tooltip={t('aspTooltip')} />
                                            <SkuTableHeader sortKey="profitMargin" title={t('profitMargin')} tooltip={t('profitMarginTooltip')} />
                                            <SkuTableHeader sortKey="returnRate" title={t('returnRate')} tooltip={t('returnRateTooltip')} />
                                            <SkuTableHeader sortKey="invRem" title={t('invRem')} tooltip={t('invRemTooltip')} />
                                            <SkuTableHeader sortKey="sellThru" title={t('sellThru')} tooltip={t('sellThruTooltip')} />
                                            <SkuTableHeader sortKey="trend" title={t('trend')} tooltip={t('trendTooltip')} />
                                            <SkuTableHeader sortKey="saleSpeed" title={t('saleSpeed')} tooltip={t('saleSpeedTooltip')} />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {skuPerformanceData.map(p => (
                                            <tr key={p.id}>
                                                <td className="py-3 px-4 flex items-center gap-3"><img src={p.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={p.name} className="w-8 h-8 rounded object-cover flex-shrink-0"/><span className="font-medium text-white">{p.name}</span></td>
                                                <td className="py-3 px-4">{p.unitsSold}</td>
                                                <td className="py-3 px-4">{p.revenue.toLocaleString()}</td>
                                                <td className="py-3 px-4">{p.asp.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                                <td className={`py-3 px-4 font-semibold ${p.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.profitMargin.toFixed(1)}%</td>
                                                <td className="py-3 px-4">{p.returnRate.toFixed(1)}%</td>
                                                <td className="py-3 px-4">{p.invRem}</td>
                                                <td className="py-3 px-4">{p.sellThru.toFixed(1)}%</td>
                                                <td className="py-3 px-4">{renderTrend(p.trend)}</td>
                                                <td className="py-3 px-4">{p.saleSpeed === Infinity ? 'N/A' : `~${p.saleSpeed.toFixed(1)}d/unit`}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : (
                 <div className="bg-[#1D3B59] p-8 rounded-lg text-center border-2 border-dashed border-gray-700">
                    <SparklesIcon className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">{t('unlockAdvancedAnalytics')}</h3>
                    <p className="text-gray-400 mt-2 max-w-lg mx-auto" dangerouslySetInnerHTML={{ __html: t('unlockAdvancedAnalyticsDesc') }} />
                </div>
            )}
            
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DetailedListCard title={t('bestSellers')} icon={<TrendingUpIcon className="w-5 h-5 text-green-400"/>}>
                    {bestSellers.length > 0 ? bestSellers.map(p => {
                       const product = shop.items.find(prod => prod.id === p.productId);
                       return (
                        <div key={p.productId} className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-md">
                             <img src={product?.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                             <div className="flex-grow min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                             </div>
                             <div className="text-right flex-shrink-0">
                                <p className="font-bold text-green-400 text-sm">{p.quantity}</p>
                                <p className="text-xs text-gray-400">{t('units')}</p>
                             </div>
                        </div>
                       );
                    }) : <p className="text-sm text-gray-500">{t('noSalesData')}</p>}
                </DetailedListCard>
                <DetailedListCard title={t('slowMovers')} icon={<TrendingDownIcon className="w-5 h-5 text-red-400"/>}>
                    {slowMovers.length > 0 ? slowMovers.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-md">
                           <img src={p.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                           <div className="flex-grow min-w-0">
                               <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                           </div>
                           <div className="text-right flex-shrink-0">
                               <p className="font-bold text-gray-400 text-sm">{p.stock}</p>
                               <p className="text-xs text-gray-500">{t('inStock')}</p>
                           </div>
                        </div>
                    )) : <p className="text-sm text-gray-500">{t('allProductsSold')}</p>}
                </DetailedListCard>
                <DetailedListCard title={t('lowStock')} icon={<AlertTriangleIcon className="w-5 h-5 text-yellow-400"/>}>
                    {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-md">
                           <img src={p.imageUrl || 'https://placehold.co/40x40/27272a/71717a?text=?'} alt={p.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                               <p className="font-semibold text-white text-sm truncate">{p.name}</p>
                           </div>
                           <div className="text-right flex-shrink-0">
                               <p className="font-bold text-yellow-400 text-sm">{p.stock}</p>
                               <p className="text-xs text-gray-400">{t('unitsLeft')}</p>
                           </div>
                        </div>
                    )) : <p className="text-sm text-gray-500">{t('noLowStock')}</p>}
                </DetailedListCard>
            </section>
            
             <section>
                 <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-200">{t('aiBusinessInsights')}</h4>
                        <span className="text-xs text-gray-400">
                            {suggestionLimit !== null ? `(${suggestionCredits}/${suggestionLimit} credits left)` : '(Unlimited credits)'}
                        </span>
                    </div>
                     <button onClick={handleGenerateSuggestion} disabled={isGeneratingSuggestion || (suggestionCredits !== null && suggestionCredits <= 0)} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-md font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed mb-4">
                        <SparklesIcon className="w-5 h-5" />
                        {isGeneratingSuggestion ? t('analyzingData') : t('generateActionableSuggestions')}
                    </button>
                    {isGeneratingSuggestion && <div className="text-center text-gray-400">{t('thinking')}...</div>}
                    {aiSuggestion && (
                        <div className="prose prose-sm prose-invert text-gray-300 max-w-none prose-p:my-2 prose-ul:my-2 prose-strong:text-white">
                            <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
                        </div>
                    )}
                </div>
             </section>
        </div>
    );
};

export default SalesDashboard;