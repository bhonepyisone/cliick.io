import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subscription, PaymentMethod, Shop, DataHistoryTier, SubscriptionPlan, SubscriptionPlanDetails, Role } from '../types';
import CreditCardIcon from './icons/CreditCardIcon';
import CheckCircleIcon from './icons-material/CheckCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import ClockIcon from './icons/ClockIcon';
import InfoIcon from './icons/InfoIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import XIcon from './icons/XIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import { getRetentionDays } from '../services/utils';
import { getPlatformSettings } from '../services/platformSettingsService';
import { useToast } from '../contexts/ToastContext';
import { useLocalization } from '../hooks/useLocalization';

interface SubscriptionPanelProps {
    shop: Shop;
    onSubscriptionChange: (subscription: Subscription) => void;
    scrollToDataExtension: boolean;
    onScrollComplete: () => void;
    onCancelScheduledExtension: () => void;
    onCommitToDataExtensionFromGracePeriod: () => void;
    onCommitToDataExtensionFromPostGrace: () => void;
    onScheduleDataDeletion: () => void;
    onScheduleDataExtension: () => void;
    onCancelRenewal: () => void;
    onUndoCancellation: () => void;
    onSchedulePlanChange: (newPlan: string) => void;
    onCancelScheduledChange: () => void;
    currentUserRole?: Role | null;
}

// Helper component for a single line of payment detail with a copy button
const DetailLineWithCopy: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    // Only show copy button if there's a colon, indicating a key-value pair
    const canCopy = text.includes(':');
    
    const handleCopy = () => {
        const valueToCopy = canCopy ? text.substring(text.indexOf(':') + 1).trim() : text;
        if (valueToCopy) {
            navigator.clipboard.writeText(valueToCopy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };
    
    return (
        <div className="relative group w-full text-left">
            <p className="text-gray-300 pr-8">{text}</p>
            {canCopy && (
                <button 
                    onClick={handleCopy} 
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Copy ${text.substring(text.indexOf(':') + 1).trim()}`}
                >
                    {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400"/> : <ClipboardIcon className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
};


// A dedicated component to render each payment method card
const PaymentMethodCard: React.FC<{ method: PaymentMethod }> = ({ method }) => {
    const [copied, setCopied] = useState(false);
    const isCrypto = method.id === 'crypto';

    const walletAddress = useMemo(() => {
        if (!isCrypto) return null;
        const lines = method.details.split('\n');
        const addressLine = lines.find(line => line.toLowerCase().includes('address:'));
        return addressLine ? addressLine.split(/:\s*/)[1]?.trim() : null;
    }, [method.details, isCrypto]);

    const otherDetails = useMemo(() => {
        const lines = method.details.split('\n');
        if (isCrypto) {
            return lines.filter(line => !line.toLowerCase().includes('address:')).join('\n');
        }
        return method.details;
    }, [method.details, isCrypto]);

    const handleCryptoCopy = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <div className="bg-gradient-to-br from-[#1D3B59] to-[#0A2540] p-6 rounded-xl border border-gray-700 text-sm text-gray-200 text-center flex flex-col items-center transition-all duration-300 ease-in-out hover:border-[#635BFF] hover:shadow-2xl hover:shadow-blue-900/50 transform hover:-translate-y-1">
            <p className="font-bold text-white mb-3 text-lg">{method.name}</p>
            
            {method.qrCodeUrl && (
                <div className="mb-4 p-1.5 bg-white rounded-lg shadow-md">
                    <img src={method.qrCodeUrl} alt={`${method.name} QR Code`} className="w-36 h-36 object-contain" />
                </div>
            )}
            
            <div className="w-full space-y-2">
                {isCrypto ? (
                    <>
                        {otherDetails.split('\n').filter(line => line.trim()).map((line, i) => <p key={i} className="text-left">{line}</p>)}
                        {walletAddress && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-400 mb-1 text-left">Wallet Address:</p>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={walletAddress}
                                        className="w-full bg-[#0A2540] border border-gray-600 rounded-md p-2 pr-10 text-xs text-gray-200"
                                    />
                                    <button onClick={handleCryptoCopy} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded text-xs bg-gray-600 hover:bg-gray-500">
                                        {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    otherDetails.split('\n').filter(line => line.trim()).map((line, i) => <DetailLineWithCopy key={i} text={line} />)
                )}
            </div>
        </div>
    );
};

const FAQItem: React.FC<{
  id: number;
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: number) => void;
}> = ({ id, question, answer, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex justify-between items-center text-left p-4 hover:bg-gray-700/30"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-200">{question}</span>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
             <div className="p-4 pt-0 text-gray-300 text-sm prose prose-sm prose-invert max-w-none prose-p:mb-2 prose-ul:my-2 prose-li:my-1">
                {answer}
            </div>
        </div>
      </div>
    </div>
  );
};


const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ shop, onSubscriptionChange, scrollToDataExtension, onScrollComplete, onCancelScheduledExtension, onCommitToDataExtensionFromGracePeriod, onCommitToDataExtensionFromPostGrace, onScheduleDataDeletion, onScheduleDataExtension, onCancelRenewal, onUndoCancellation, onSchedulePlanChange, onCancelScheduledChange, currentUserRole }) => {
    const { subscription } = shop;
    const { showToast } = useToast();
    const { t } = useLocalization();
    
    // RBAC: Only OWNER can access subscription settings
    if (currentUserRole !== Role.OWNER && currentUserRole !== null) {
        return (
            <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-2 text-[#F6F9FC]">{t('subscription')}</h2>
                <p className="text-red-400 text-sm">{t('accessDenied')}</p>
                <p className="text-gray-400 text-xs mt-2">Only the shop owner can manage subscriptions.</p>
            </div>
        );
    }
    
    const platformSettings = getPlatformSettings();
    const platformCurrency = platformSettings.currency;
    
    const { staticPlans, growthTiers, allPlans } = useMemo(() => {
        const staticPlans = platformSettings.subscriptionPlans.filter(p => !p.family);
        const growthTiers = platformSettings.subscriptionPlans
            .filter(p => p.family === 'Growth' && !p.isTemplate)
            .sort((a, b) => (a.automatedTransactions || 0) - (b.automatedTransactions || 0));
        return { staticPlans, growthTiers, allPlans: platformSettings.subscriptionPlans };
    }, [platformSettings.subscriptionPlans]);

    const currentPlanDetails = useMemo(() => 
        allPlans.find(p => p.id === subscription.plan)
    , [allPlans, subscription.plan]);

    const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
        const initialPlanId = subscription.pendingPlan || subscription.plan;
        if (initialPlanId === 'Trial') {
            // Default to first growth tier if on trial, then starter, then whatever is first.
            return growthTiers[0]?.id || staticPlans.find(p => p.id === 'plan_starter')?.id || allPlans[0].id;
        }
        // For any other active or pending plan, just use that as the initial selection.
        return initialPlanId || allPlans[0].id;
    });

    const [mainPaymentProof, setMainPaymentProof] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDataHistoryOpen, setIsDataHistoryOpen] = useState(true);
    const [openFaqId, setOpenFaqId] = useState<number | null>(null);

    const enabledPaymentMethods = platformSettings.paymentMethods.filter(p => p.enabled);
    const dataExtensionRef = useRef<HTMLDivElement>(null);
    const planSelectionRef = useRef<HTMLDivElement>(null);
    
    const {
        isPlanActive,
        hasPendingChange,
        isInPaymentWindow,
        isChangingPlan,
        renewalDate,
        selectedPlanDetails,
        pendingPlanDetails
    } = useMemo(() => {
        const PAYMENT_WINDOW_DAYS = 7;
        const isPlanActive = subscription.status === 'active';
        const hasPendingChange = !!subscription.pendingPlan;
        const pendingPlanDetails = hasPendingChange ? allPlans.find(p => p.id === subscription.pendingPlan) : null;
        const selectedPlanDetails = allPlans.find(p => p.id === selectedPlanId)!;
        const isChangingPlan = selectedPlanDetails.id !== currentPlanDetails?.id;
        
        const renewalDate = subscription.periodEndsAt ? new Date(subscription.periodEndsAt) : null;
        const isInPaymentWindow = isPlanActive && renewalDate && (renewalDate.getTime() - Date.now()) < (PAYMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000) && (renewalDate.getTime() > Date.now());

        return { isPlanActive, hasPendingChange, isInPaymentWindow, isChangingPlan, renewalDate, selectedPlanDetails, pendingPlanDetails };
    }, [subscription, allPlans, selectedPlanId, currentPlanDetails]);


     // --- Data History Extension Logic ---
    const totalOrders = shop.formSubmissions.length;
    const totalConversations = shop.liveConversations.length;
    const totalRecords = totalOrders + totalConversations;
    
    const retentionDays = getRetentionDays(shop.subscription.plan);
    
    const oldestDataTimestamp = useMemo(() => {
        if (shop.formSubmissions.length === 0 && shop.liveConversations.length === 0) return Date.now();
        const allTimestamps = [...shop.formSubmissions.map(s => s.submittedAt), ...shop.liveConversations.map(c => c.lastMessageAt)];
        return Math.min(...allTimestamps);
    }, [shop.formSubmissions, shop.liveConversations]);

    const dataHistoryTiers = useMemo(() => [...platformSettings.dataHistoryTiers].sort((a,b) => a.recordLimit - b.recordLimit), [platformSettings.dataHistoryTiers]);
    const requiredTier = useMemo(() => dataHistoryTiers.find(tier => totalRecords <= tier.recordLimit) || dataHistoryTiers[dataHistoryTiers.length - 1], [dataHistoryTiers, totalRecords]);

    const dataExt = subscription.dataHistoryExtension;
    const dataExtStatus = dataExt?.status;
    const daysUntilDeletion = dataExt?.deletionScheduledAt ? Math.max(0, 30 - Math.floor((Date.now() - dataExt.deletionScheduledAt) / (1000 * 60 * 60 * 24))) : 0;

    const isDataAtRisk = useMemo(() => {
        if (dataExtStatus === 'active' || dataExtStatus === 'pending_activation' || dataExtStatus === 'pending_deletion' || dataExtStatus === 'deletion_applied' || dataExtStatus === 'pending_cancellation') {
            return false;
        }
        const warningThreshold = Date.now() - ((retentionDays - 14) * 24 * 60 * 60 * 1000);
        const isApproachingLimit = oldestDataTimestamp < warningThreshold;
        const retentionCutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const isOverLimit = oldestDataTimestamp < retentionCutoff;
        return isApproachingLimit || isOverLimit;
    }, [oldestDataTimestamp, retentionDays, dataExtStatus]);
    
    const dataExtensionCharge = useMemo(() => {
        if (dataExtStatus === 'pending_activation') {
            return requiredTier?.price || 0;
        }
        return 0;
    }, [dataExtStatus, requiredTier]);

    const planForPayment = useMemo(() => {
        if (isPlanActive) {
            if (isInPaymentWindow) {
                return pendingPlanDetails || selectedPlanDetails;
            }
            return selectedPlanDetails;
        }
        return selectedPlanDetails;
    }, [isPlanActive, isInPaymentWindow, pendingPlanDetails, selectedPlanDetails]);

    const totalAmountDue = useMemo(() => {
        const isRenewalOrUpgrade = !isPlanActive || isInPaymentWindow;
        if (isRenewalOrUpgrade) {
             return (planForPayment?.price || 0) + dataExtensionCharge;
        }
        return 0;
    }, [planForPayment, dataExtensionCharge, isPlanActive, isInPaymentWindow]);

    useEffect(() => {
        if (scrollToDataExtension && dataExtensionRef.current) {
            dataExtensionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onScrollComplete();
        }
    }, [scrollToDataExtension, onScrollComplete]);

    const handleMainSubmit = () => {
        if (!planForPayment || planForPayment.name === 'Trial') {
            showToast("Cannot submit for a trial plan.", 'error');
            return;
        }
        if (!mainPaymentProof) {
            showToast("Please upload a proof of payment.", 'error');
            return;
        }

        setIsSubmitting(true);
        const reader = new FileReader();
        reader.onloadend = () => {
             onSubscriptionChange({
                ...subscription,
                status: 'pending_approval',
                pendingPlan: planForPayment.id,
                paymentProof: reader.result as string,
            });
            showToast(t('paymentSubmittedForReview'), 'success');
            setIsSubmitting(false);
            setMainPaymentProof(null);
        };
        reader.readAsDataURL(mainPaymentProof);
    };
    
    const handleScheduleChangeAndScroll = (newPlanId: string) => {
        onSchedulePlanChange(newPlanId);
        setTimeout(() => {
            planSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleFaqToggle = (id: number) => {
        setOpenFaqId(prevId => (prevId === id ? null : id));
    };

    const faqs = [
        {
            question: 'What is the "Data Grace Period"?',
            answer: <p>This is a 30-day safety net. If you choose not to extend your data history, old data is hidden but not immediately deleted. You have 30 days to change your mind and reactivate the extension to recover it before it's gone permanently.</p>
        },
        {
            question: 'What is the "Payment Window" and what happens if I pay early?',
            answer: <p>It’s a 7-day period before your renewal date where you can conveniently pay for your next cycle. Paying early is great! It simply extends your subscription <strong>from your original renewal date</strong>, so you don't lose any days. For example, if your plan ends on the 30th and you pay on the 25th, your new plan will still end on the 30th of the <strong>next</strong> month.</p>
        },
        {
            question: 'What is the "Data History Extension" add-on?',
            answer: <p>It's an optional add-on that allows you to keep all your order and conversation history on our platform indefinitely. Each subscription plan has a default retention period (e.g., 90 days for Starter). This add-on removes that limit.</p>
        },
        {
            question: "What happens if I don't get the Data History Extension?",
            answer: (
                <>
                    <p>The Data History Extension is completely optional! Your subscription plan already includes a standard data retention period (e.g., 90 days for the Starter plan).</p>
                    <p>If you choose not to get the extension, our system respects your preference by managing your data according to your plan's limits. Here’s how it works:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-2">
                        <li><strong>Grace Period (Safety Net):</strong> When your data (like orders and chats) becomes older than your plan's retention period, we don't delete it immediately. Instead, it enters a 30-day <strong>Data Grace Period</strong> where it is simply hidden from view. This acts as a safety net, giving you plenty of time to reconsider.</li>
                        <li><strong>Permanent Deletion:</strong> If you decide not to act during the grace period, the hidden historical data will then be permanently deleted.</li>
                    </ol>
                    <p>Your recent data will, of course, always remain visible and accessible. You are always in control.</p>
                </>
            )
        },
        {
            question: 'How do I change my subscription plan?',
            answer: (
                <>
                    <p>You have two options:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong>Schedule a change:</strong> At any time, you can select a new plan to start on your next renewal date.</li>
                        <li><strong>Change immediately:</strong> If you're within your 7-day "Payment Window," you can select a new plan and pay for it right away to activate it for the next cycle.</li>
                    </ul>
                </>
            )
        },
        {
            question: 'How do I cancel the Data History Extension?',
            answer: <p>You can cancel it at any time from this page. Your extension will remain active until the end of your current billing period, after which the standard data retention rules for your plan will apply.</p>
        },
        {
            question: 'How does payment verification work?',
            answer: <p>After you upload your proof of payment (screenshot), our team manually reviews it. We approve all payments within 24 business hours. Once approved, your subscription status will update to 'Active'.</p>
        },
        {
            question: 'What are the main differences between the plans?',
            answer: <p>The <strong>Starter</strong> plan is great for getting started with a generous transaction limit. The <strong>Growth</strong> plan offers a higher limit for scaling businesses. The <strong>Brand</strong> plan is for informational sites. The <strong>Pro</strong> plan unlocks all features with no limits on core functions like transactions and products.</p>
        },
        {
            question: 'If my old data is deleted from Cliick.io, is it gone from Facebook too?',
            answer: <p><strong>Absolutely not!</strong> We only manage the data stored on our platform. Your original messages in your Facebook Page Inbox and your comments on your posts are <strong>never</strong> touched or deleted by our system.</p>
        }
    ];

    const growthTemplate = allPlans.find(p => p.isTemplate && p.family === 'Growth');
    const displayedGrowthTier = growthTiers.find(p => p.id === selectedPlanId) || growthTiers.find(p => p.id === currentPlanDetails?.id) || growthTiers[0];
    const isPlanSelectionLocked = subscription.isUpgradeCommitted || subscription.status === 'pending_approval';

    const PlanCard: React.FC<{ plan: SubscriptionPlanDetails }> = ({ plan }) => {
        const isSelected = selectedPlanId === plan.id;
        const isCurrent = currentPlanDetails?.id === plan.id;
        const isPending = subscription.pendingPlan === plan.id;
        
        return (
            <div 
                onClick={() => !isPlanSelectionLocked && setSelectedPlanId(plan.id)}
                className={`p-4 rounded-xl border-2 transition-all relative ${isPlanSelectionLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isSelected ? 'border-[#635BFF] bg-[#1D3B59]/50 ring-2 ring-[#635BFF]/50' : 'border-gray-700 bg-[#1D3B59]/30 hover:border-gray-600'}`}
            >
                {isCurrent && <span className="absolute top-2 right-2 text-xs bg-green-500 text-green-900 font-bold px-2 py-0.5 rounded-full">Current</span>}
                {isPending && <span className="absolute top-2 right-2 text-xs bg-blue-500 text-blue-900 font-bold px-2 py-0.5 rounded-full">Scheduled</span>}

                <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                <p className="text-2xl font-extrabold text-[#A09CFF] my-2">{plan.price.toLocaleString()} {platformCurrency} / month</p>
                <ul className="space-y-1.5 text-sm text-gray-300">
                    {plan.features.map(feature => (
                        <li key={feature} className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };
    
    const starterPlan = staticPlans.find(p => p.id === 'plan_starter');
    const brandPlan = staticPlans.find(p => p.id === 'plan_brand');
    const proPlan = staticPlans.find(p => p.id === 'plan_pro');


    return (
        <div className="bg-[#0A2540] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
             <style>{`
                @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out forwards; }
                .grid-rows-\\[0fr\\] { grid-template-rows: 0fr; }
                .grid-rows-\\[1fr\\] { grid-template-rows: 1fr; }
            `}</style>
            <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold mb-2 text-white text-center">
                  Subscription & Billing
                </h2>
                <p className="text-center text-gray-400 mb-8">Manage your plan and optional add-ons.</p>

                {/* Status Notification Banners */}
                 {subscription.status === 'active' && !hasPendingChange && (
                    <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg relative mb-8 flex items-center gap-4" role="alert">
                        <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
                        <div className="flex-grow">
                            <strong className="font-bold">Your Current Plan: {currentPlanDetails?.name} {currentPlanDetails?.family === 'Growth' ? `(${currentPlanDetails.tierName})` : ''}</strong>
                            <p className="text-sm">
                                {renewalDate ? `Your plan is active and renews on ${renewalDate.toLocaleDateString()}.` : 'Your plan is active.'}
                            </p>
                        </div>
                    </div>
                )}
                 {subscription.status === 'active' && hasPendingChange && (
                    <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg relative mb-8 flex items-center gap-4" role="alert">
                        <ClockIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
                        <div className="flex-grow">
                            <strong className="font-bold">Plan Change Scheduled!</strong>
                            <p className="text-sm">
                                Your plan will switch to <strong>{pendingPlanDetails?.name} {pendingPlanDetails?.family === 'Growth' ? `(${pendingPlanDetails.tierName})` : ''}</strong> on {renewalDate?.toLocaleDateString()}.
                            </p>
                        </div>
                         <div className="relative group">
                            <button
                                onClick={onCancelScheduledChange}
                                disabled={subscription.isUpgradeCommitted}
                                className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                Cancel Change
                            </button>
                            {subscription.isUpgradeCommitted && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">
                                    {t('instantUpgradeLockedTooltip')}
                                </div>
                            )}
                        </div>
                    </div>
                 )}
                {subscription.status === 'pending_approval' && (
                    <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg relative mb-8 flex items-start gap-4" role="alert">
                        <ClockIcon className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-grow">
                            <strong className="font-bold">Payment Under Review</strong>
                            <p className="block sm:inline text-sm">Your payment for the <strong>{pendingPlanDetails?.name} {pendingPlanDetails?.family === 'Growth' ? `(${pendingPlanDetails?.tierName})` : ''} plan</strong> is being verified. This may take up to 24 hours.</p>
                        </div>
                        {subscription.paymentProof && (
                            <div className="flex-shrink-0 text-center">
                                <p className="text-xs text-gray-400 mb-1">Submitted Proof:</p>
                                <a href={subscription.paymentProof} target="_blank" rel="noopener noreferrer">
                                     <img src={subscription.paymentProof} alt="Payment proof" className="w-16 h-16 object-cover rounded-md border border-gray-600 hover:border-blue-400" />
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Plan Selection */}
                <div ref={planSelectionRef} className="mb-10">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center"><span className="bg-[#635BFF] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">1</span> Choose Your Plan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {starterPlan && <PlanCard key={starterPlan.id} plan={starterPlan} />}
                        
                        {growthTiers.length > 0 && displayedGrowthTier && (
                             <div 
                                onClick={() => !isPlanSelectionLocked && displayedGrowthTier && setSelectedPlanId(displayedGrowthTier.id)}
                                className={`p-4 rounded-xl border-2 transition-all relative ${isPlanSelectionLocked ? 'cursor-not-allowed opacity-50' : ''} ${selectedPlanId === displayedGrowthTier.id ? 'border-[#635BFF] bg-[#1D3B59]/50 ring-2 ring-[#635BFF]/50' : 'border-gray-700 bg-[#1D3B59]/30 hover:border-gray-600'}`}
                            >
                                {currentPlanDetails?.id === displayedGrowthTier.id && <span className="absolute top-2 right-2 text-xs bg-green-500 text-green-900 font-bold px-2 py-0.5 rounded-full">Current</span>}
                                {subscription.pendingPlan === displayedGrowthTier.id && <span className="absolute top-2 right-2 text-xs bg-blue-500 text-blue-900 font-bold px-2 py-0.5 rounded-full">Scheduled</span>}

                                <h4 className="text-lg font-bold text-white">Growth</h4>
                                <p className="text-2xl font-extrabold text-[#A09CFF] my-2">{displayedGrowthTier.price.toLocaleString()} {platformCurrency} / month</p>
                                
                                <select 
                                    value={displayedGrowthTier.id} 
                                    onChange={e => setSelectedPlanId(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white mb-3"
                                    onClick={e => e.stopPropagation()}
                                    disabled={isPlanSelectionLocked}
                                >
                                    {growthTiers.map(tier => (
                                        <option key={tier.id} value={tier.id}>
                                            {tier.tierName}: {tier.automatedTransactions?.toLocaleString()} {t('conversionsUnit')}
                                        </option>
                                    ))}
                                </select>

                                <ul className="space-y-1.5 text-sm text-gray-300">
                                    {growthTemplate?.features.filter(feature => !feature.includes('{{transactions}}')).map(feature => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span className="text-xs">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {brandPlan && <PlanCard key={brandPlan.id} plan={brandPlan} />}
                        {proPlan && <PlanCard key={proPlan.id} plan={proPlan} />}
                    </div>
                </div>
                {/* ... The rest of the component remains the same ... */}
                 <div className="mb-10">
                     <button
                        onClick={() => setIsDataHistoryOpen(!isDataHistoryOpen)}
                        className="w-full flex justify-between items-center text-left p-3 bg-[#1D3B59]/50 rounded-lg border border-gray-700 hover:bg-[#2c4f73]/50"
                        aria-expanded={isDataHistoryOpen}
                    >
                        <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-3">
                            <span className="bg-[#635BFF] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm">2</span>
                            Data History Extension (Optional Add-on)
                        </h3>
                        <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isDataHistoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDataHistoryOpen && (
                        <div id="data-extension" ref={dataExtensionRef} className="mt-4 animate-fade-in-fast">
                             <p className="text-center text-gray-400 mb-6 max-w-2xl mx-auto text-sm">Our plans include a generous history allowance. For those who need to retain all data indefinitely, we offer this affordable add-on.</p>
                    
                            <div className="max-w-xl mx-auto bg-[#1D3B59]/40 p-4 rounded-lg border border-gray-700 mb-6">
                                <h4 className="font-semibold text-center text-gray-300 mb-3">Your Current Data Records</h4>
                                <div className="grid grid-cols-3 divide-x divide-gray-600 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-white">{totalOrders}</p>
                                        <p className="text-xs text-gray-400">Order Records</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-white">{totalConversations}</p>
                                        <p className="text-xs text-gray-400">Inbox Conversations</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[#A09CFF]">{totalRecords}</p>
                                        <p className="text-xs text-gray-400">Total Records</p>
                                    </div>
                                </div>
                            </div>

                            {dataExtStatus === 'pending_activation' && (
                                <div className="bg-blue-900/50 p-6 rounded-lg border border-blue-700 text-center">
                                    <h4 className="text-lg font-bold text-blue-300 flex items-center justify-center gap-2"><ClockIcon className="w-5 h-5"/> Data Extension is Scheduled!</h4>
                                    <p className="text-sm text-blue-200 mt-2 max-w-xl mx-auto">
                                        The <strong>{requiredTier?.name}</strong> tier will be added to your next billing cycle for an additional <strong>{requiredTier?.price.toLocaleString()} {platformCurrency}</strong>. No further action is needed.
                                    </p>
                                    {dataExt.isCommitted === false && (
                                        <button
                                            onClick={onCancelScheduledExtension}
                                            className="mt-4 text-sm text-gray-300 bg-gray-700/80 hover:bg-gray-600/80 px-4 py-1.5 rounded-md"
                                        >
                                            Cancel Schedule
                                        </button>
                                    )}
                                </div>
                            )}
                            {dataExtStatus === 'pending_cancellation' && ( <div className="bg-yellow-900/70 p-6 rounded-lg border-2 border-dashed border-yellow-600 text-center"> <h4 className="text-lg font-bold text-yellow-300 flex items-center justify-center gap-2"><ClockIcon className="w-5 h-5"/> Cancellation Scheduled</h4> <p className="text-sm text-yellow-200 mt-2 max-w-xl mx-auto"> Your Data History Extension is scheduled to be cancelled at the end of your current billing period on <strong>{new Date(shop.subscription.periodEndsAt!).toLocaleDateString()}</strong>. </p> <button onClick={onUndoCancellation} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-2 px-6 rounded-lg transition-colors"> Undo Cancellation </button> </div> )}
                            {dataExtStatus === 'pending_deletion' && ( <div className="bg-yellow-900/70 p-6 rounded-lg border-2 border-dashed border-yellow-600 text-center"> <h4 className="text-lg font-bold text-yellow-300 flex items-center justify-center gap-2"><AlertTriangleIcon className="w-5 h-5"/> Data is Scheduled for Deletion!</h4> <p className="text-sm text-yellow-200 mt-2 max-w-xl mx-auto"> Historical data older than {retentionDays} days is currently hidden and will be permanently deleted in approximately <strong>{daysUntilDeletion} days</strong>. You can undo this action before the grace period ends. </p> <button onClick={onCommitToDataExtensionFromGracePeriod} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-bold py-2 px-6 rounded-lg transition-colors"> Undo & Keep All Data </button> </div> )}
                            {dataExtStatus === 'deletion_applied' && ( <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 text-center"> <h4 className="text-lg font-bold text-gray-300 flex items-center justify-center gap-2"><XIcon className="w-5 h-5 text-red-400"/> Historical Data Deleted</h4> <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto"> Data older than {retentionDays} days has been permanently deleted according to your plan's policy. To prevent future data loss, you can schedule the data history extension now. </p> <button onClick={onCommitToDataExtensionFromPostGrace} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"> Extend Future Data History </button> </div> )}
                            {(dataExtStatus === 'inactive' || !dataExtStatus) && isDataAtRisk && ( 
                                <div className="bg-[#1D3B59]/50 p-6 rounded-lg border border-gray-700 text-center"> 
                                    <h4 className="text-lg font-bold text-gray-300">Your Data Needs Attention</h4>
                                    <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto"> Your shop contains data older than your plan's {retentionDays}-day retention period. You can choose to extend your history or let older data be automatically deleted. </p>
                                    <div className="text-xs text-gray-400 mt-3 max-w-xl mx-auto text-left bg-gray-900/50 p-3 rounded-md border border-gray-600">
                                        <p className="mb-2">If you don't extend, you can download your order history from the "Sale Assistant" &gt; "Order Data" tab.</p>
                                        <p>Chat history is only hidden from our platform. You will always have access to the original chats in your Facebook Page's Messenger Inbox.</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-center gap-4"> 
                                        <button onClick={onScheduleDataDeletion} className="text-sm text-gray-300 bg-gray-700/80 hover:bg-gray-600/80 px-4 py-2 rounded-md"> Keep Recent Data Only </button>
                                        <button onClick={onScheduleDataExtension} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"> Extend & Keep All Data </button>
                                    </div>
                                </div> 
                            )}
                            {(dataExtStatus === 'inactive' || !dataExtStatus) && !isDataAtRisk && ( <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 text-center"> <h4 className="text-lg font-bold text-gray-300">Data Retention Status</h4> <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto"> Your data history is currently covered by your <strong>{shop.subscription.plan} plan</strong>. All records up to <strong>{retentionDays} days</strong> old are being retained. </p> </div> )}
                            {dataExtStatus === 'active' && ( <div className="bg-green-900/50 p-6 rounded-lg border border-green-700 text-center"> <h4 className="text-lg font-bold text-green-300 flex items-center justify-center gap-2"><CheckCircleIcon className="w-5 h-5"/> Data Extension is Active!</h4> <p className="text-sm text-green-200 mt-2 max-w-xl mx-auto"> All your order and conversation history is being retained. This add-on will renew with your main subscription. </p> <button onClick={onCancelRenewal} className="mt-4 text-sm text-gray-300 bg-gray-700/80 hover:bg-gray-600/80 px-4 py-1.5 rounded-md"> Cancel Renewal </button> </div> )}
                            
                            <div className="mt-8">
                                {requiredTier && ( <div className="max-w-md mx-auto mb-4"> <p className="text-sm text-center text-gray-400 mb-2">Based on your total records, you need the following tier:</p> <div className={`p-4 rounded-lg border-2 border-blue-500 bg-blue-900/30 text-center`}> <p className="font-semibold text-white text-lg">{requiredTier.name}</p> <p className="text-2xl font-bold text-blue-400 mt-1">{requiredTier.price > 0 ? `${requiredTier.price.toLocaleString()} ${platformCurrency} / month` : 'Contact Us'}</p> </div> </div> )}
                                {/* ... Tier display logic ... */}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-10">
                     <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center"><span className="bg-[#635BFF] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">3</span> Make Payment</h3>
                     <p className="text-sm text-gray-400 mb-6 text-center">
                        Please transfer the total amount due to one of the accounts below.
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {enabledPaymentMethods.length > 0 ? (
                            enabledPaymentMethods.map(method => (
                                <PaymentMethodCard key={method.id} method={method} />
                            ))
                        ) : (
                            <div className="bg-gray-700 p-4 rounded-md text-sm text-gray-300 text-center md:col-span-3">
                                No payment methods are currently configured. Please contact support.
                            </div>
                        )}
                     </div>
                </div>

                <div className="mb-12">
                     <h3 className="text-lg font-semibold text-gray-300 mb-4 text-center"><span className="bg-[#635BFF] text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-sm mr-2">4</span> Confirm Payment</h3>
                     <div className="bg-[#1D3B59]/50 p-6 rounded-lg border border-gray-700 max-w-lg mx-auto">
                        
                        {(!isPlanActive || isInPaymentWindow) && (
                            <>
                                <div className="space-y-2 text-white border-b border-gray-700 pb-4 mb-4">
                                    <div className="flex justify-between text-sm"><span>{planForPayment?.name} {planForPayment?.tierName ? `(${planForPayment.tierName})` : ''} Plan</span><span>{planForPayment?.price.toLocaleString()} {platformCurrency}</span></div>
                                     <div className={`flex justify-between text-sm ${dataExtensionCharge > 0 ? '' : 'text-gray-400'}`}>
                                        <span>Data Extension Charges</span>
                                        <span>{dataExtensionCharge.toLocaleString()} {platformCurrency}</span>
                                     </div>
                                    <div className="flex justify-between text-lg font-bold pt-2"><span>Total Amount Due</span><span>{totalAmountDue.toLocaleString()} {platformCurrency}</span></div>
                                </div>

                                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Payment Screenshot</label>
                                 <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => setMainPaymentProof(e.target.files?.[0] || null)}
                                    disabled={isSubmitting || subscription.status === 'pending_approval'}
                                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                 />
                                 <p className="text-xs text-gray-500 mt-2">Once your payment is verified, your plan and any scheduled add-ons will be activated.</p>
                             </>
                        )}
                        
                         <div className="mt-6 text-center relative group">
                            <button 
                                onClick={
                                    isPlanActive && !isInPaymentWindow && isChangingPlan 
                                        ? () => handleScheduleChangeAndScroll(selectedPlanDetails.id) 
                                        : handleMainSubmit
                                }
                                disabled={
                                    isSubmitting || 
                                    (isPlanActive && !isChangingPlan && !isInPaymentWindow) || 
                                    (!isPlanActive && !mainPaymentProof) ||
                                    (isInPaymentWindow && !mainPaymentProof) ||
                                    subscription.status === 'pending_approval' ||
                                    subscription.isUpgradeCommitted
                                }
                                className="bg-[#635BFF] hover:bg-[#524cc9] text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            >
                                <CreditCardIcon className="w-5 h-5" />
                                {(() => {
                                    if (subscription.isUpgradeCommitted) return 'Upgrade Scheduled';
                                    if (subscription.status === 'pending_approval') return 'Submission Pending';
                                    if (isSubmitting) return 'Submitting...';
                                    if (isPlanActive) {
                                        if (isInPaymentWindow) return `Renew with ${planForPayment.name} ${planForPayment.tierName ? `(${planForPayment.tierName})` : ''}`;
                                        if (isChangingPlan) return `Schedule Change to ${selectedPlanDetails.name} ${selectedPlanDetails.tierName ? `(${selectedPlanDetails.tierName})` : ''}`;
                                        return 'Current Plan is Active';
                                    }
                                    return `Upgrade to ${selectedPlanDetails.name} ${selectedPlanDetails.tierName ? `(${selectedPlanDetails.tierName})` : ''}`;
                                })()}
                            </button>
                            {subscription.isUpgradeCommitted && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10">
                                    {t('instantUpgradeLockedTooltip')}
                                </div>
                            )}
                         </div>
                     </div>
                </div>

                <div className="max-w-5xl mx-auto mt-12">
                    <h2 className="text-2xl font-bold mb-4 text-white text-center">
                        Frequently Asked Questions
                    </h2>
                    <div className="bg-[#1D3B59]/50 rounded-lg border border-gray-700">
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                id={index}
                                question={faq.question}
                                answer={faq.answer}
                                isOpen={openFaqId === index}
                                onToggle={handleFaqToggle}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPanel;