
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-3">
                 <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    A
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ahmad</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your vocabulary & translation guide</p>
                </div>
            </div>
        </header>
    );
};

export default Header;