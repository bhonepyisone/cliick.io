import React from 'react';
import { Message, MessageSender, CarouselItem, PersistentMenuItem, CarouselItemButton } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';
import Carousel from './Carousel';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface MessageProps {
  message: Message;
  onCarouselButtonClick: (button: CarouselItemButton) => void;
  onPersistentButtonClick: (item: PersistentMenuItem) => void;
}

const MessageComponent: React.FC<MessageProps> = ({ message, onCarouselButtonClick, onPersistentButtonClick }) => {
  const isUser = message.sender === MessageSender.USER;
  const isBot = message.sender === MessageSender.BOT;

  const wrapperClass = `flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClass = `max-w-xl p-4 rounded-2xl shadow-md ${
    isUser
      ? 'bg-[#635BFF] text-white rounded-br-none'
      : 'bg-[#2c4f73] text-gray-200 rounded-bl-none'
  }`;
  const textClass = 'text-sm whitespace-pre-wrap';
  const mediaContainerClass = `mb-2 overflow-hidden rounded-lg ${!message.text ? 'p-0' : ''}`;
  const mediaClass = `w-full h-auto object-cover max-w-xs`;

  if (message.carousel) {
      return (
          <div className="my-4 w-full">
              <Carousel items={message.carousel} onButtonClick={onCarouselButtonClick} />
          </div>
      );
  }

  const renderPersistentButtons = () => {
    if (!message.persistentButtons || message.persistentButtons.length === 0) {
      return null;
    }
    return (
      <div className="mt-1 border-t border-gray-500/50">
        {message.persistentButtons.map((button) => {
          const commonClasses = "w-full text-left text-sm font-medium text-blue-300 hover:bg-black/20 p-2.5 flex justify-between items-center transition-colors duration-150";

          if (button.type === 'web_url' && button.url) {
            return (
              <a
                key={button.id}
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${commonClasses} border-t border-gray-500/50 first:border-t-0`}
              >
                <span>{button.title}</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </a>
            );
          }
          
          return (
            <button
              key={button.id}
              onClick={() => onPersistentButtonClick(button)}
              className={`${commonClasses} border-t border-gray-500/50 first:border-t-0`}
            >
              <span>{button.title}</span>
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </button>
          );
        })}
      </div>
    );
  };


  return (
    <div className={wrapperClass}>
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-gray-300" />
        </div>
      )}
      <div className={bubbleClass} style={{ padding: (message.attachment && !message.text) ? '0.5rem' : '1rem' }}>
        {message.attachment && (
            <div className={mediaContainerClass}>
                {(message.attachment.type === 'image' || message.attachment.type === 'gif') && 
                    <img src={message.attachment.url} alt="Attachment" className={mediaClass} />
                }
                {message.attachment.type === 'video' && 
                    <video src={message.attachment.url} controls className={mediaClass} />
                }
            </div>
        )}
        {message.text && <p className={textClass}>{message.text}</p>}
        {renderPersistentButtons()}
      </div>
       {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-gray-300" />
        </div>
      )}
    </div>
  );
};

export default MessageComponent;
