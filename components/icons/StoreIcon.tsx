import React from 'react';

const StoreIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
        <path d="M3 9.5l9-7 9 7" />
        <path d="M3 9.5V21h18V9.5" />
        <path d="M12 15a3 3 0 00-3 3h6a3 3 0 00-3-3z" />
    </svg>
);

export default StoreIcon;
