import React from 'react';
import { motion } from 'framer-motion';
import { ApiCategory } from '../types';
interface CategoryTabsProps {
  categories: ApiCategory[];
  activeCategoryId: string | number | null;
  onSelectCategory: (categoryId: string | number | null) => void;
}
export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory
}: CategoryTabsProps) {
  return (
    <div className="w-full overflow-x-auto pb-2 no-scrollbar">
      <div className="flex space-x-2 min-w-max px-1">
        {/* "All" tab */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${activeCategoryId === null ? 'text-[#1a1a2e]' : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-100'}`}>

          All
          {activeCategoryId === null &&
          <motion.div
            layoutId="category-tab"
            className="absolute inset-0 bg-[#ff6b35] bg-opacity-10 rounded-full border border-[#ff6b35]"
            transition={{
              type: 'spring',
              bounce: 0.2,
              duration: 0.6
            }} />

          }
        </button>

        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-100'}`}>

              {cat.name}
              {isActive &&
              <motion.div
                layoutId="category-tab"
                className="absolute inset-0 bg-[#ff6b35] bg-opacity-10 rounded-full border border-[#ff6b35]"
                transition={{
                  type: 'spring',
                  bounce: 0.2,
                  duration: 0.6
                }} />

              }
            </button>);

        })}
      </div>
    </div>);

}