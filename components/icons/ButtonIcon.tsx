import React from 'react';

const ButtonIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2.5 2a.5.5 0 000 1h6a.5.5 0 000-1h-6zM6 11.5a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5z" 
    />
  </svg>
);

export default ButtonIcon;