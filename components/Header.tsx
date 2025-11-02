import React from 'react';
import { VocabularyCategory } from '../types';
import InfoIcon from './icons/InfoIcon';

const categories: VocabularyCategory[] = ['General', 'Food & Dining', 'Travel', 'Technology', 'At Home'];

interface HeaderProps {
    selectedCategory: VocabularyCategory;
    onSelectCategory: (category: VocabularyCategory) => void;
    onOpenAbout: () => void;
}


const Header: React.FC<HeaderProps> = ({ selectedCategory, onSelectCategory, onOpenAbout }) => {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        A
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ahmad</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your vocabulary & translation guide</p>
                    </div>
                </div>
                 <button 
                    onClick={onOpenAbout} 
                    aria-label="About Ahmad" 
                    title="About Ahmad"
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 dark:focus:ring-offset-gray-800"
                >
                    <InfoIcon />
                </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 items-center justify-start">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Category:</p>
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => onSelectCategory(category)}
                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 dark:focus:ring-offset-gray-800
                            ${selectedCategory === category
                                ? 'bg-pink-500 text-white shadow'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                            }
                        `}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </header>
    );
};

export default Header;