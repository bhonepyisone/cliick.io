import React from 'react';

const TelegramIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.62 11.93c-.58-.19-.57-.54.1-.7l16.25-6.3c.45-.17.88.19.71.65L18.7 18.06c-.19.82-.76.99-1.4.61l-4.18-3.08-1.93 1.86c-.22.22-.4.38-.69.38z" />
    </svg>
);

export default TelegramIcon;