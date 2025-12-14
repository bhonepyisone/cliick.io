import React from 'react';

const CliickLogo: React.FC<{ className?: string; textColor?: string; }> = ({ className = "h-8", textColor }) => {
  const style: React.CSSProperties = {};
  if (textColor === 'black') {
    // This filter combination makes the logo black
    style.filter = 'grayscale(1) brightness(0)';
  }

  return (
    <img 
      src="https://i.postimg.cc/Ls4HQ8YF/Cliick-Logo-with-Full-Text-5.png" 
      alt="Cliick.io Logo" 
      className={className} 
      style={style}
    />
  );
};

export default CliickLogo;