import React from 'react';

const DragHandleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <circle cx="9" cy="12" r="1.5"></circle>
    <circle cx="9" cy="5" r="1.5"></circle>
    <circle cx="9" cy="19" r="1.5"></circle>
    <circle cx="15" cy="12" r="1.5"></circle>
    <circle cx="15" cy="5" r="1.5"></circle>
    <circle cx="15" cy="19" r="1.5"></circle>
  </svg>
);

export default DragHandleIcon;
