import React from 'react';

const IdentificationIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
 <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12a2 2 0 1 0-2-2" />
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 3.58 8 8 8" />
    <path d="M12 4a8 8 0 0 1 8 8" />
    <path d="M12 6a6 6 0 0 1 6 6" />
    <path d="M12 8a4 4 0 0 1 4 4" />
    <path d="M12 18c-2.21 0-4-1.79-4-4" />
    <path d="M12 20c-3.31 0-6-2.69-6-6" />
    <path d="M12 22c-4.42 0-8-3.58-8-8" />
  </svg>
);

export default IdentificationIcon;