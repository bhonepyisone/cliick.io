import React, { useState, ReactNode, useEffect, useRef } from 'react';
import api from '../services/apiService';
import CliickLogo from './icons/CliickLogo';
import { useLocalization } from '../hooks/useLocalization';
import LegalModal from './LegalModal';
import { TermsContent } from './legal/terms';
import { PrivacyPolicyContent } from './legal/privacy';
import PhoneIcon from './icons/PhoneIcon';
import VideoIcon from './icons/VideoIcon';
import PlusIcon from './icons/PlusIcon';
import CameraIcon from './icons/CameraIcon';
import ImageIcon from './icons/ImageIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SendIcon from './icons/SendIcon';

interface AuthProps {
    // No props needed - authentication is unified
}

const MessengerAnimation = () => {
    // This is the source of truth for the conversation
    const allMessages = [
        { text: "Hi! I saw this beautiful Artisan Ceramic Mug on your page. Is it still available?", sender: 'customer', delay: 100 },
        { text: "Hello! Yes, the Artisan Ceramic Mug is one of our best-sellers and it's currently in stock.", sender: 'bot', delay: 1200 },
        { text: "Would you like to place an order?", sender: 'bot', delay: 900 },
        { text: "Yes, please! I'd like one.", sender: 'customer', delay: 1000 },
        { text: "Great! To proceed, I'll need a few details.", sender: 'bot', delay: 1200 },
        { text: "Of course. What is your full name?", sender: 'bot', delay: 900 },
        { text: "May.", sender: 'customer', delay: 1000 },
        { text: "Thanks. And your phone number?", sender: 'bot', delay: 1200 },
        { text: "0912345678", sender: 'customer', delay: 1000 },
        { text: "Perfect. Lastly, your full shipping address?", sender: 'bot', delay: 1200 },
        { text: "123 Main Street, Yangon.", sender: 'customer', delay: 1000 },
        { text: "Thank you! Your order for one Artisan Ceramic Mug is confirmed.", sender: 'bot', delay: 1200 },
        { text: "Your Order ID is #TCCS-1008.", sender: 'bot', delay: 900 },
    ];
    
    // State to hold the messages that are currently visible
    const [visibleMessages, setVisibleMessages] = useState<(typeof allMessages)[0][]>([]);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    // Effect to add messages one by one in a loop
    useEffect(() => {
        let timeouts: NodeJS.Timeout[] = [];
        
        const runAnimation = () => {
            // Clear previous timeouts if the animation restarts
            timeouts.forEach(clearTimeout);
            timeouts = [];
            setVisibleMessages([]);
            
            let cumulativeDelay = 0;

            allMessages.forEach(message => {
                cumulativeDelay += message.delay;
                const timeout = setTimeout(() => {
                    setVisibleMessages(prev => [...prev, message]);
                }, cumulativeDelay);
                timeouts.push(timeout);
            });
        };

        runAnimation(); // Initial run

        const totalDuration = allMessages.reduce((sum, msg) => sum + msg.delay, 0) + 4000; // 4s pause at the end
        const intervalId = setInterval(runAnimation, totalDuration);

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
            timeouts.forEach(clearTimeout);
        };
    }, []); // Empty dependency array ensures this runs only once to set up the loop

    // Effect to scroll to the bottom when new messages are added
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [visibleMessages]);


    return (
        <div className="w-72 h-[36rem] bg-gray-900 rounded-[3rem] p-2 border-4 border-gray-700 shadow-2xl">
          <div className="w-full h-full bg-white rounded-[2.5rem] flex flex-col overflow-hidden text-gray-800">
            {/* Header */}
            <header className="flex-shrink-0 p-3 border-b flex items-center justify-between shadow-sm bg-gray-50 rounded-t-[2.5rem]">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                <img className="w-10 h-10 rounded-full" src="https://i.pravatar.cc/40?u=may" alt="May" />
                <div>
                  <h2 className="text-sm font-bold">May</h2>
                  <p className="text-xs text-gray-500">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <PhoneIcon className="w-6 h-6 text-blue-500" />
                <VideoIcon className="w-6 h-6 text-blue-500" />
              </div>
            </header>

            {/* Chat Body */}
             <div 
                ref={chatBodyRef} 
                className="flex-grow p-4 flex flex-col overflow-y-auto no-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className="flex-grow"></div>
                <div className="space-y-4">
                    {visibleMessages.map((msg, index) => (
                        <div 
                          key={index}
                          className="animate-[chat-bubble-in-bottom_0.5s_ease-out_forwards] flex w-full"
                          style={{ 
                            justifyContent: msg.sender === 'customer' ? 'flex-start' : 'flex-end'
                          }}
                        >
                          {msg.sender === 'customer' ? (
                             <div className="flex items-end gap-2 max-w-[75%]">
                              <img className="w-7 h-7 rounded-full" src="https://i.pravatar.cc/40?u=may" alt="May" />
                              <div className="bg-gray-200 rounded-2xl rounded-bl-none p-3 w-fit">
                                <p className="text-sm text-left">{msg.text}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-end max-w-[75%]">
                              <div className="bg-blue-500 text-white rounded-2xl rounded-br-none p-3 w-fit">
                                <p className="text-sm text-left">{msg.text}</p>
                              </div>
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="flex-shrink-0 p-2 border-t flex items-center gap-1 bg-gray-50 rounded-b-[2.5rem]">
              <PlusIcon className="w-8 h-8 p-1 text-blue-500" />
              <CameraIcon className="w-8 h-8 p-1 text-blue-500" />
              <ImageIcon className="w-8 h-8 p-1 text-blue-500" />
              <MicrophoneIcon className="w-8 h-8 p-1 text-blue-500" />
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Aa"
                  className="w-full bg-gray-200 rounded-full py-2 px-4 pr-10 text-sm focus:outline-none"
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">😊</div>
              </div>
              <SendIcon className="w-8 h-8 p-1 text-blue-500" />
            </footer>
          </div>
        </div>
    );
};


const Auth: React.FC<AuthProps> = () => {
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const { t, language, setLanguage } = useLocalization();

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Signup state
    const [signupEmail, setSignupEmail] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [signupError, setSignupError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Modal state
    const [modalContent, setModalContent] = useState<{ title: string; content: ReactNode } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail)) {
            setLoginError('Please enter a valid email address');
            return;
        }
        
        const success = await api.login(loginEmail, loginPassword);
        if (!success) {
            setLoginError(t('loginError'));
        } else {
            setLoginError('');
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSignupError('');
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(signupEmail)) {
            setSignupError('Please enter a valid email address');
            return;
        }
        
        // Validate username
        if (signupUsername.length < 3) {
            setSignupError('Username must be at least 3 characters');
            return;
        }
        
        if (signupPassword !== signupConfirmPassword) {
            setSignupError(t('passwordsDoNotMatch'));
            return;
        }
        
        if (signupPassword.length < 6) {
            setSignupError('Password must be at least 6 characters');
            return;
        }
        
        if (!agreedToTerms) {
            setSignupError('You must agree to the terms and conditions.');
            return;
        }
        
        const result = await api.signup(signupEmail, signupPassword, signupUsername);
        if (!result.success) {
            setSignupError(result.message);
        } else {
            // Switch to login tab and show success message
            setActiveTab('login');
            setLoginEmail(signupEmail);
        }
    };
    
    const showTerms = () => setModalContent({ title: 'Terms and Conditions', content: <TermsContent /> });
    const showPrivacy = () => setModalContent({ title: 'Privacy Policy', content: <PrivacyPolicyContent /> });

    const commonInputClass = "w-full bg-gray-100 border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow";

    return (
        <>
            {modalContent && (
                <LegalModal title={modalContent.title} onClose={() => setModalContent(null)}>
                    {modalContent.content}
                </LegalModal>
            )}
            <div className="flex h-screen w-full items-center justify-center font-sans bg-[#0A2540] p-4">
                 <div className="flex h-full w-full mx-auto overflow-hidden bg-[#1D3B59] rounded-3xl shadow-2xl">
                    {/* Left Visual Panel */}
                    <div className="relative hidden w-1/2 flex flex-col items-center justify-center bg-gradient-to-br from-[#4c46c8] to-[#8d3c87] md:flex p-12 text-center">
                        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,91,255,0.15),_transparent_75%)]"></div>
                        
                        <div className="relative z-10 mb-8">
                            <CliickLogo className="h-10 mb-4 mx-auto" />
                            <h1 className="whitespace-pre-line text-4xl font-bold leading-tight text-white drop-shadow-lg">
                                {t('slogan')}
                            </h1>
                        </div>

                        <div className="relative z-10">
                            <MessengerAnimation />
                        </div>
                    </div>

                    {/* Right Form Panel */}
                    <div className="w-full md:w-1/2 bg-gray-50 p-6 lg:p-8 text-gray-800 flex flex-col justify-center">
                        <div className="w-full max-w-sm m-auto bg-white p-6 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <CliickLogo className="h-6" textColor="black" />
                                <div className="flex items-center gap-1 text-sm border border-gray-200 rounded-full p-1">
                                    <button onClick={() => setLanguage('my')} className={`px-2 py-0.5 rounded-full text-xs ${language === 'my' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{t('burmeseShort')}</button>
                                    <button onClick={() => setLanguage('en')} className={`px-2 py-0.5 rounded-full text-xs ${language === 'en' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{t('englishShort')}</button>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">{activeTab === 'login' ? t('login') : t('signup')}</h2>
                            
                            <div className="flex mb-4">
                                <button onClick={() => setActiveTab('login')} className={`flex-1 pb-2 text-sm font-semibold transition-colors ${activeTab === 'login' ? 'text-gray-800 border-b-2 border-[#635BFF]' : 'text-gray-500 hover:text-gray-800'}`}>
                                    {t('login')}
                                </button>
                                <button onClick={() => setActiveTab('signup')} className={`flex-1 pb-2 text-sm font-semibold transition-colors ${activeTab === 'signup' ? 'text-gray-800 border-b-2 border-[#635BFF]' : 'text-gray-500 hover:text-gray-800'}`}>
                                    {t('signup')}
                                </button>
                            </div>
                            
                            {activeTab === 'login' ? (
                                <form onSubmit={handleLogin} className="space-y-3">
                                    <div>
                                        <label htmlFor="login-email" className="block text-gray-700 text-xs font-semibold mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            id="login-email" 
                                            value={loginEmail} 
                                            onChange={(e) => setLoginEmail(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="your.email@example.com" 
                                            required 
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="login-password-auth" className="block text-gray-700 text-xs font-semibold mb-1">{t('password')}</label>
                                        <input 
                                            type="password" 
                                            id="login-password-auth" 
                                            value={loginPassword} 
                                            onChange={(e) => setLoginPassword(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="************" 
                                            required
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={rememberMe} 
                                                onChange={(e) => setRememberMe(e.target.checked)} 
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                            />
                                            <span className="text-xs text-gray-600">Remember me</span>
                                        </label>
                                    </div>
                                    {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                                    <button type="submit" className="w-full bg-gradient-to-r from-[#635BFF] via-[#B34EAF] to-[#E64A83] hover:opacity-90 text-white font-semibold py-2.5 px-4 rounded-lg transition-opacity text-sm">
                                        {t('login')}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSignup} className="space-y-3">
                                    <div>
                                        <label htmlFor="signup-email" className="block text-gray-700 text-xs font-semibold mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            id="signup-email" 
                                            value={signupEmail} 
                                            onChange={(e) => setSignupEmail(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="your.email@example.com" 
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="signup-username" className="block text-gray-700 text-xs font-semibold mb-1">{t('username')}</label>
                                        <input 
                                            type="text" 
                                            id="signup-username" 
                                            value={signupUsername} 
                                            onChange={(e) => setSignupUsername(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="choose_a_username" 
                                            required
                                            autoComplete="username"
                                            minLength={3}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="signup-password-auth" className="block text-gray-700 text-xs font-semibold mb-1">{t('password')}</label>
                                        <input 
                                            type="password" 
                                            id="signup-password-auth" 
                                            value={signupPassword} 
                                            onChange={(e) => setSignupPassword(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="************" 
                                            required
                                            autoComplete="new-password"
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirm-password" className="block text-gray-700 text-xs font-semibold mb-1">{t('confirmPassword')}</label>
                                        <input 
                                            type="password" 
                                            id="confirm-password" 
                                            value={signupConfirmPassword} 
                                            onChange={(e) => setSignupConfirmPassword(e.target.value)} 
                                            className={commonInputClass} 
                                            placeholder="************" 
                                            required
                                            autoComplete="new-password"
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-start gap-2 cursor-pointer">
                                            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-gray-600">
                                                I agree to the <button type="button" onClick={showTerms} className="underline text-blue-600 hover:text-blue-500">Terms</button> and <button type="button" onClick={showPrivacy} className="underline text-blue-600 hover:text-blue-500">Privacy Policy</button>
                                            </span>
                                        </label>
                                    </div>
                                    {signupError && <p className="text-red-500 text-xs">{signupError}</p>}
                                    <button type="submit" disabled={!agreedToTerms} className="w-full bg-gradient-to-r from-[#635BFF] via-[#B34EAF] to-[#E64A83] hover:opacity-90 text-white font-semibold py-2.5 px-4 rounded-lg transition-opacity disabled:bg-gray-400 disabled:cursor-not-allowed text-sm">
                                        {t('createAccount')}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                 </div>
            </div>
        </>
    );
}

export default Auth;