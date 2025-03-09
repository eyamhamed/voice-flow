import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface ConversionIdeaProps {
  onSelect: (idea: string) => void;
  className?: string;
}

export default function ConversionIdea({ onSelect, className = '' }: ConversionIdeaProps) {
  // Categories of conversation starters
  const ideaCategories = {
    "Fun": [
      "Tell me a joke",
      "What's the most interesting fact you know?",
      "If you could have any superpower, what would it be?",
      "Play a word game with me"
    ],
    "Help": [
      "What can you help me with?",
      "How do I get started?",
      "What are your capabilities?",
      "How does this work?"
    ],
    "Learn": [
      "Tell me about space exploration",
      "Explain quantum computing",
      "How does AI work?",
      "Teach me something new"
    ]
  };

  const [activeCategory, setActiveCategory] = useState<keyof typeof ideaCategories>("Fun");
  const [showAll, setShowAll] = useState(false);
  const [visibleIdeas, setVisibleIdeas] = useState<string[]>([]);
  
  // Update visible ideas when category changes
  useEffect(() => {
    if (showAll) {
      // Flatten all categories into one array
      const allIdeas = Object.values(ideaCategories).flat();
      setVisibleIdeas(allIdeas);
    } else {
      setVisibleIdeas(ideaCategories[activeCategory]);
    }
  }, [activeCategory, showAll]);

  const nextCategory = () => {
    const categories = Object.keys(ideaCategories) as (keyof typeof ideaCategories)[];
    const currentIndex = categories.indexOf(activeCategory);
    const nextIndex = (currentIndex + 1) % categories.length;
    setActiveCategory(categories[nextIndex]);
  };

  const prevCategory = () => {
    const categories = Object.keys(ideaCategories) as (keyof typeof ideaCategories)[];
    const currentIndex = categories.indexOf(activeCategory);
    const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
    setActiveCategory(categories[prevIndex]);
  };

  const toggleShowAll = () => {
    setShowAll(!showAll);
  };

  return (
    <div className={`w-full max-w-md ${className}`}>
      {/* Category selector */}
      <div className="flex items-center justify-between mb-3">
        {!showAll && (
          <>
            <button 
              onClick={prevCategory}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Previous category"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <h3 className="text-sm font-medium text-gray-500">{activeCategory}</h3>
            
            <button 
              onClick={nextCategory}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Next category"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        
        {showAll && (
          <h3 className="text-sm font-medium text-gray-500">All suggestions</h3>
        )}
        
        <button 
          onClick={toggleShowAll}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          aria-label={showAll ? "Show categories" : "Show all ideas"}
        >
          <Plus className={`h-4 w-4 transform transition-transform ${showAll ? 'rotate-45' : ''}`} />
        </button>
      </div>
      
      {/* Ideas grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleIdeas.map((idea, index) => (
          <button
            key={index}
            onClick={() => onSelect(idea)}
            className="
              px-3 py-2.5 text-sm 
              bg-white border border-gray-200 rounded-lg
              text-gray-600 text-left truncate
              hover:bg-gray-50 hover:border-gray-300 
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              transition-all
            "
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );
}