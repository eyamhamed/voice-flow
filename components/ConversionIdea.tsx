import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface ConversionIdeaProps {
  onSelect: (idea: string) => void;
  className?: string;
}

export default function ConversionIdea({ onSelect, className = '' }: ConversionIdeaProps) {
  // Categories of Ikigai conversation starters
  const ideaCategories = useMemo(() => ({
    "Discover": [
      "Qu'est-ce que l'Ikigai?",
      "Comment l'Ikigai peut améliorer ma vie?",
      "Expliquez-moi le concept japonais d'Ikigai",
      "Quelles sont les quatre dimensions de l'Ikigai?"
    ],
    "Passions": [
      "Quelles activités me procurent de la joie?",
      "Qu'est-ce que j'aime faire pendant mon temps libre?",
      "Quelles sont les choses qui me font perdre la notion du temps?",
      "Comment identifier mes véritables passions?"
    ],
    "Talents": [
      "Quelles sont mes forces naturelles?",
      "Pour quelles compétences suis-je souvent complimenté?",
      "Qu'est-ce qui me semble facile mais difficile pour d'autres?",
      "Comment puis-je développer mes talents existants?"
    ],
    "Mission": [
      "Comment puis-je contribuer au monde?",
      "Quels problèmes me tiennent à cœur?",
      "Comment puis-je aligner mon travail avec mes valeurs?",
      "Quels besoins du monde résonnent avec moi?"
    ],
    "Profession": [
      "Comment puis-je gagner ma vie avec mes passions?",
      "Quelles carrières correspondent à mon Ikigai?",
      "Comment puis-je transformer mes talents en revenus?",
      "Quelles opportunités professionnelles devrais-je explorer?"
    ]
  }), []);

  const [activeCategory, setActiveCategory] = useState<keyof typeof ideaCategories>("Discover");
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
  }, [activeCategory, showAll, ideaCategories]);

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
              aria-label="Catégorie précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <h3 className="text-sm font-medium text-gray-500">{activeCategory}</h3>
            
            <button 
              onClick={nextCategory}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Catégorie suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        
        {showAll && (
          <h3 className="text-sm font-medium text-gray-500">Toutes les questions</h3>
        )}
        
        <button 
          onClick={toggleShowAll}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          aria-label={showAll ? "Afficher les catégories" : "Afficher toutes les questions"}
        >
          <Plus className={`h-4 w-4 transform transition-transform ${showAll ? 'rotate-45' : ''}`} />
        </button>
      </div>
      
      {/* Ideas grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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