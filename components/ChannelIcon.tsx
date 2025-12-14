import React from 'react';
import { LiveChatChannel } from '../types';
import FacebookIcon from './icons/FacebookIcon';
import InstagramIcon from './icons/InstagramIcon';
import TikTokIcon from './icons/TikTokIcon';
import TelegramIcon from './icons/TelegramIcon';
import ViberIcon from './icons/ViberIcon';
import WebChatIcon from './icons/WebChatIcon';

interface ChannelIconProps {
    channel: LiveChatChannel;
    className?: string;
}

const ChannelIcon: React.FC<ChannelIconProps> = ({ channel, className = "w-5 h-5" }) => {
    switch (channel) {
        case 'facebook':
            return <FacebookIcon className={className} />;
        case 'instagram':
            return <InstagramIcon className={className} />;
        case 'tiktok':
            return <TikTokIcon className={className} />;
        case 'telegram':
            return <TelegramIcon className={className} />;
        case 'viber':
            return <ViberIcon className={className} />;
        case 'web':
        default:
            return <WebChatIcon className={className} />;
    }
};

export default ChannelIcon;