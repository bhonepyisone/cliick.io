import React from 'react';

const ApiIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
        <path d="M4 13.33V6.67C4 5.19 5.19 4 6.67 4h10.67C18.81 4 20 5.19 20 6.67v6.67C20 14.81 18.81 16 17.33 16H6.67C5.19 16 4 14.81 4 13.33z" />
        <path d="M12 16v4" />
        <path d="M10 20h4" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </svg>
);

export default ApiIcon;