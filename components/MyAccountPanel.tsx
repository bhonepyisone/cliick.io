import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateUser, isUsernameTaken } from '../services/authService';
import { useLocalization } from '../hooks/useLocalization';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import UserIcon from './icons/UserIcon';
import FacebookIcon from './icons/FacebookIcon';
import GoogleIcon from './icons/GoogleIcon';
import { sanitizeText, validateUsername } from '../utils/sanitize';

const MyAccountPanel: React.FC<{ onUserUpdate: (user: User) => void }> = ({ onUserUpdate }) => {
    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const { t } = useLocalization();
    const { showToast } = useToast();

    // Refresh current user when it changes externally
    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
    }, []);

    const [username, setUsername] = useState(currentUser?.username || '');
    const [usernameError, setUsernameError] = useState('');
    const [isSavingUsername, setIsSavingUsername] = useState(false);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    
    // Mocked auth method for UI demonstration
    const authMethod: 'password' | 'google' | 'facebook' = currentUser?.googleId ? 'google' : (currentUser?.facebookId ? 'facebook' : 'password');


    const handleUsernameSave = async () => {
        setUsernameError('');
        if (!currentUser) return;
        
        // Sanitize and validate username
        const sanitized = sanitizeText(username.trim());
        const validation = validateUsername(sanitized);
        
        if (!validation.valid) {
            setUsernameError(validation.error || 'Invalid username');
            return;
        }
        
        if (sanitized === currentUser.username) {
            setUsernameError(t('usernameSame'));
            return;
        }
        
        setIsSavingUsername(true);
        try {
            // Check if username is taken
            const taken = await isUsernameTaken(sanitized);
            if (taken) {
                setUsernameError(t('usernameTaken'));
                setIsSavingUsername(false);
                return;
            }
            
            // Update username via Supabase
            const result = await updateUser(currentUser.id, { username: sanitized });
            if (result.success && result.user) {
                onUserUpdate(result.user);
                setCurrentUser(result.user);
                showToast(t('usernameUpdateSuccess'), 'success');
                console.log('✅ Username updated in database');
            } else {
                setUsernameError(result.message || t('usernameUpdateFailed'));
            }
        } catch (error) {
            console.error('❌ Failed to update username:', error);
            setUsernameError('Failed to update username. Please try again.');
        } finally {
            setIsSavingUsername(false);
        }
    };
    
    const handlePasswordSave = async () => {
        setPasswordError('');
        if (!currentUser) return;
        if (!password) {
            setPasswordError(t('passwordEmpty'));
            return;
        }
        if (password !== confirmPassword) {
            setPasswordError(t('passwordsDoNotMatch'));
            return;
        }
        
        setIsSavingPassword(true);
        try {
            // Update password via Supabase
            const result = await updateUser(currentUser.id, { passwordHash: password });
            if (result.success && result.user) {
                onUserUpdate(result.user);
                setCurrentUser(result.user);
                showToast(t('accountSettingsSaved'), 'success');
                setPassword('');
                setConfirmPassword('');
                console.log('✅ Password updated in database');
            } else {
                setPasswordError(result.message || t('passwordUpdateFailed'));
            }
        } catch (error) {
            console.error('❌ Failed to update password:', error);
            setPasswordError('Failed to update password. Please try again.');
        } finally {
            setIsSavingPassword(false);
        }
    };
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && currentUser) {
            if (!file.type.startsWith('image/')) {
                showToast('Please upload a valid image file.', 'error');
                return;
            }
            if (file.size > 512 * 1024) { // 512KB limit
                showToast('Image file size must be under 512KB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = async () => {
                const avatarUrl = reader.result as string;
                try {
                    const result = await updateUser(currentUser.id, { avatarUrl });
                    if (result.success && result.user) {
                        onUserUpdate(result.user);
                        setCurrentUser(result.user);
                        showToast('Profile picture updated!', 'success');
                        console.log('✅ Avatar updated in database');
                    } else {
                        showToast('Failed to update profile picture.', 'error');
                    }
                } catch (error) {
                    console.error('❌ Failed to update avatar:', error);
                    showToast('Failed to update profile picture.', 'error');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveAvatar = async () => {
        if (currentUser) {
            try {
                const result = await updateUser(currentUser.id, { avatarUrl: '' });
                if (result.success && result.user) {
                    onUserUpdate(result.user);
                    setCurrentUser(result.user);
                    showToast('Profile picture removed.', 'success');
                    console.log('✅ Avatar removed from database');
                }
            } catch (error) {
                console.error('❌ Failed to remove avatar:', error);
                showToast('Failed to remove profile picture.', 'error');
            }
        }
    };


    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg shadow-lg h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-[#F6F9FC]">{t('myAccount')}</h2>
            <div className="space-y-8 max-w-lg">
                
                {/* Profile Picture */}
                 <div className="space-y-3">
                    <h3 className="font-semibold text-gray-200">Profile Picture</h3>
                     <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600 flex-shrink-0">
                            {currentUser?.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt="User avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-12 h-12 text-gray-500" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="avatar-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm inline-block">
                                Upload New Photo
                            </label>
                            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            {currentUser?.avatarUrl && (
                                <button onClick={handleRemoveAvatar} className="text-xs text-red-400 hover:underline ml-3">Remove Photo</button>
                            )}
                            <p className="text-xs text-gray-400">Max file size: 512KB.</p>
                        </div>
                    </div>
                </div>

                {/* Change Username */}
                <div className="space-y-3 border-t border-gray-700 pt-6">
                    <h3 className="font-semibold text-gray-200">{t('changeUsername')}</h3>
                    <div>
                        <label htmlFor="username" className="block text-sm text-gray-400 mb-1">{t('username')}</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setUsernameError(''); }}
                            className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-2 text-sm text-[#F6F9FC]"
                            disabled={isSavingUsername}
                        />
                    </div>
                    <button onClick={handleUsernameSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait" disabled={isSavingUsername || username.trim() === currentUser?.username}>
                        {isSavingUsername && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isSavingUsername ? t('saving') : t('saveChanges')}
                    </button>
                    {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
                </div>

                 {/* Connected Accounts */}
                <div className="space-y-3 border-t border-gray-700 pt-6">
                    <h3 className="font-semibold text-gray-200">Connected Accounts</h3>
                    {authMethod === 'password' && (
                        <div className="space-y-2">
                             <p className="text-sm text-gray-400">You are currently signed in with your username and password.</p>
                             <div className="flex gap-2">
                                <button className="flex-1 inline-flex justify-center items-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg border border-gray-600 bg-gray-800 text-white hover:bg-gray-700">
                                    <GoogleIcon className="w-5 h-5" /> Link Google Account
                                </button>
                                <button className="flex-1 inline-flex justify-center items-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg border border-transparent bg-[#1877F2] text-white hover:bg-[#166eab]">
                                    <FacebookIcon className="w-5 h-5" /> Link Facebook Account
                                </button>
                            </div>
                        </div>
                    )}
                    {authMethod === 'google' && (
                         <div className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3"><GoogleIcon className="w-6 h-6"/> <span className="font-semibold">Connected via Google</span></div>
                            <button className="text-xs text-red-400 hover:underline" disabled>Unlink</button>
                        </div>
                    )}
                    {authMethod === 'facebook' && (
                        <div className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3"><FacebookIcon className="w-6 h-6 text-white"/> <span className="font-semibold">Connected via Facebook</span></div>
                            <button className="text-xs text-red-400 hover:underline" disabled>Unlink</button>
                        </div>
                    )}
                </div>

                 {/* Change Password */}
                 <div className="space-y-3 border-t border-gray-700 pt-6">
                    <h3 className="font-semibold text-gray-200">{authMethod === 'password' ? t('changePassword') : 'Password'}</h3>
                    {authMethod === 'password' ? (
                        <>
                            <div>
                                <label htmlFor="new-password" className="block text-sm text-gray-400 mb-1">{t('newPassword')}</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                                    className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-2 text-sm text-[#F6F9FC]"
                                    disabled={isSavingPassword}
                                />
                            </div>
                             <div>
                                <label htmlFor="confirm-password-my-account" className="block text-sm text-gray-400 mb-1">{t('confirmPassword')}</label>
                                <input
                                    id="confirm-password-my-account"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                                    className="w-full bg-[#2c4f73] border border-[#4a6b8c] rounded-lg p-2 text-sm text-[#F6F9FC]"
                                    disabled={isSavingPassword}
                                />
                            </div>
                            <button onClick={handlePasswordSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait" disabled={isSavingPassword}>
                                {isSavingPassword && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                {isSavingPassword ? t('saving') : t('saveChanges')}
                            </button>
                        </>
                    ) : (
                         <div>
                            <p className="text-sm text-gray-400">You currently sign in using a social account. You can set a password to enable email/password login as an alternative.</p>
                            <button className="mt-3 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md font-semibold" disabled>
                                Set a Password
                            </button>
                            <p className="text-xs text-gray-500 mt-2">Setting a password will allow you to unlink your social account.</p>
                         </div>
                    )}
                     {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                </div>
            </div>
        </div>
    );
};

export default MyAccountPanel;