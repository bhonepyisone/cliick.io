import React from 'react';

const ButtonEditorIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
        <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        <path d="M16 4.99 8 5" />
        <path d="M16 19.01 8 19" />
        <path d="M12 14.5l-3-3 5.5-5.5a2.121 2.121 0 1 1 3 3L12 14.5z" />
    </svg>
);

export default ButtonEditorIcon;
