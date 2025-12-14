import React from 'react';

const PosIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        <line x1="6" y1="11" x2="6" y2="11.01"></line>
        <line x1="10" y1="11" x2="10" y2="11.01"></line>
        <line x1="6" y1="15" x2="6" y2="15.01"></line>
        <line x1="10" y1="15" x2="10" y2="15.01"></line>
    </svg>
);

export default PosIcon;