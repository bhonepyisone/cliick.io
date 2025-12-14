import React from 'react';

const MegaphoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
        <path d="M3 11l18-5v12L3 14V11zm18-5v12" />
        <path d="M6 11H3v3h3" />
    </svg>
);

export default MegaphoneIcon;
