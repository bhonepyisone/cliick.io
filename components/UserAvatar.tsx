import React from 'react';
import { User } from '../types';
import UserIcon from './icons/UserIcon';

const UserAvatar: React.FC<{ user: User | null | undefined, className?: string }> = ({ user, className = "w-8 h-8" }) => {
    if (user?.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.username} className={`${className} rounded-full object-cover`} />;
    }
    
    const initials = user ? user.username.substring(0, 2).toUpperCase() : '?';

    return (
        <div className={`${className} rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white`}>
            {user ? initials : <UserIcon className="w-1/2 h-1/2" />}
        </div>
    );
};

export default UserAvatar;