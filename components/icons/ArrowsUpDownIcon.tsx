import React from 'react';

const ArrowsUpDownIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8 7l4-4m0 0l4 4m-4-4v18m0 0l4-4m-4 4l-4-4" 
        />
    </svg>
);
export default ArrowsUpDownIcon;