import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, MessageSender, QuickReplyAction, Attachment, Shop, PersistentMenuItem, CarouselItemButton } from '../types';
import MessageComponent from './Message';
import SendIcon from './icons/SendIcon';
import BotIcon from './icons/BotIcon';
import PhoneIcon from './icons/PhoneIcon';
import VideoIcon from './icons/VideoIcon';
import PlusIcon from './icons/PlusIcon';
import MenuIcon from './icons/MenuIcon';
import { useLocalization } from '../hooks/useLocalization';
import { useToast } from '../contexts/ToastContext';
import { generatePersistentMenuItems } from '../hooks/useChatLogic';


const QuickReply: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 text-sm font-semibold text-[#a5a2ff] bg-[#0A2540]/50 border border-[#423ca8] rounded-full hover:bg-[#322d84]/70 transition-colors"
    >
        {text}
    </button>
);

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (payload: string, displayText?: string) => void;
  onCarouselButtonClick: (button: CarouselItemButton) => void;
  onQuickReplyClick: (reply: QuickReplyAction) => void;
  onSendAttachment: (base64Url: string) => void;
  shop: Shop;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, onCarouselButtonClick, onQuickReplyClick, onSendAttachment, shop }) => {
  const { t } = useLocalization();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPersistentMenuOpen, setIsPersistentMenuOpen] = useState(false);

  const menuItems = useMemo(() => generatePersistentMenuItems(shop), [shop]);

  const lastMessage = messages[messages.length - 1];
  const hasQuickReplies = lastMessage?.sender === MessageSender.BOT && lastMessage.quickReplies && lastMessage.quickReplies.length > 0;

  useEffect(() => {
    // Whenever messages change, assume new quick replies should be shown
    setShowQuickReplies(true);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
      setShowQuickReplies(false);
    }
  };
  
  const handleQuickReplyClick = (reply: QuickReplyAction) => {
    onQuickReplyClick(reply);
    setShowQuickReplies(false);
  };

  const handlePersistentItemClick = (item: PersistentMenuItem) => {
    setIsPersistentMenuOpen(false);
    if (item.type === 'web_url' && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
        // Handle 'open_form' and 'postback' by converting to QuickReplyAction
        const quickReply: QuickReplyAction = {
            title: item.title,
            payload: item.payload || '',
            type: item.type === 'open_form' ? 'open_form' : 'postback',
        };
        onQuickReplyClick(quickReply);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onSendAttachment(base64String);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="bg-[#1D3B59] rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-3 border-b border-[#2c4f73] flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <BotIcon className="w-6 h-6 text-gray-300" />
                  </div>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#1D3B59]"></span>
              </div>
              <div>
                  <h2 className="text-md font-bold text-[#F6F9FC]">AI Assistant</h2>
                  <p className="text-xs text-gray-400">Active now</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <button disabled className="text-gray-500 cursor-not-allowed">
                  <PhoneIcon className="w-5 h-5" />
              </button>
              <button disabled className="text-gray-500 cursor-not-allowed">
                  <VideoIcon className="w-6 h-6" />
              </button>
          </div>
      </div>
      <div className="flex-grow min-h-0 overflow-y-auto p-6">
          {messages.map((msg, index) => (
            <MessageComponent key={index} message={msg} onCarouselButtonClick={onCarouselButtonClick} onPersistentButtonClick={handlePersistentItemClick} />
          ))}
          {isLoading && (
              <div className="flex items-start gap-3 my-4 justify-start">
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <div className="w-5 h-5 text-gray-300 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
                  </div>
                  <div className="max-w-xl p-4 rounded-2xl shadow-md bg-[#2c4f73] text-gray-200 rounded-bl-none">
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      </div>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
      </div>
      
       {showQuickReplies && hasQuickReplies && (
          <div className="flex-shrink-0 px-6 pb-2 pt-1 flex flex-wrap items-center gap-2 border-t border-[#2c4f73]">
              {lastMessage.quickReplies!.map((reply, index) => (
                  <QuickReply key={index} text={reply.title} onClick={() => handleQuickReplyClick(reply)} />
              ))}
          </div>
      )}

      <div className="flex-shrink-0 p-2 border-t border-[#2c4f73] relative">
          {isPersistentMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/30 z-20"
                onClick={() => setIsPersistentMenuOpen(false)}
              ></div>
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#1D3B59] border border-[#2c4f73] rounded-lg p-2 shadow-lg z-30 animate-slide-up-fast">
                <div className="space-y-1">
                  {menuItems.map((item) => {
                     if (item.type === 'web_url' && item.url) {
                        return (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#2c4f73] rounded-md"
                          >
                            {item.title}
                          </a>
                        );
                      }
                      return (
                        <button
                          key={item.id}
                          onClick={() => handlePersistentItemClick(item)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#2c4f73] rounded-md"
                        >
                          {item.title}
                        </button>
                      );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
               <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#8c88ff] rounded-full hover:bg-[#2c4f73]/50 transition-colors"
                aria-label="Send attachment"
                disabled={isLoading}
              >
                  <PlusIcon className="w-5 h-5"/>
              </button>
              <div className="relative flex-grow">
                  <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('typeAMessage')}
                      className="w-full bg-[#2c4f73] rounded-full py-2 px-4 pr-4 text-sm text-[#F6F9FC] placeholder-gray-400 focus:ring-1 focus:ring-[#635BFF] focus:outline-none resize-none"
                      rows={1}
                      disabled={isLoading}
                  />
              </div>
              <button
                  onClick={handleSend}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2 rounded-full text-[#8c88ff] hover:bg-[#2c4f73]/50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
              >
                  <SendIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsPersistentMenuOpen(prev => !prev)}
                className="p-2 text-[#8c88ff] rounded-full hover:bg-[#2c4f73]/50 transition-colors"
                aria-label="Open menu"
                disabled={isLoading}
              >
                  <MenuIcon className="w-5 h-5"/>
              </button>
          </div>
      </div>
    </div>
  );
};

export default ChatWindow;
