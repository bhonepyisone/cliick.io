import React from 'react';
import { CarouselItem, CarouselItemButton } from '../types';

interface CarouselProps {
    items: CarouselItem[];
    onButtonClick: (button: CarouselItemButton) => void;
}

const Carousel: React.FC<CarouselProps> = ({ items, onButtonClick }) => {
    return (
        <div className="w-full overflow-x-auto pb-4">
            <div className="flex space-x-3 px-4">
                {items.map((item, index) => (
                    <div key={index} className="flex-shrink-0 w-64 bg-[#2c4f73] rounded-lg shadow-md overflow-hidden border border-[#4a6b8c]">
                        {item.imageUrl && (
                             <div className="aspect-square w-full bg-gray-600">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        )}
                        <div className="p-3">
                            <h3 className="font-bold text-[#F6F9FC] text-md truncate">{item.title}</h3>
                            {item.subtitle && <p className="text-sm text-gray-300">{item.subtitle}</p>}
                            <div className="mt-3 border-t border-[#4a6b8c] pt-2">
                                {item.buttons.map((button, btnIndex) => (
                                    <button 
                                        key={btnIndex}
                                        onClick={() => onButtonClick(button)}
                                        className="w-full text-center px-3 py-1.5 text-sm font-semibold text-[#a5a2ff] hover:bg-[#4a6b8c] rounded-md transition-colors"
                                    >
                                        {button.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Carousel;