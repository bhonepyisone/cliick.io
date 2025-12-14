import React from 'react';

const ChannelsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M2 12h20" />
    </svg>
);

export default ChannelsIcon;