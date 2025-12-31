import { useState } from 'react';
import { PuzzlePart } from '../types';

interface PuzzleDisplayProps {
  parts: PuzzlePart[];
}

function PuzzleDisplay({ parts }: PuzzleDisplayProps) {
  const [selectedPart, setSelectedPart] = useState<PuzzlePart | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePartClick = (part: PuzzlePart, index: number) => {
    setSelectedPart(part);
    setSelectedIndex(index);
  };

  const closeModal = () => {
    setSelectedPart(null);
    setSelectedIndex(null);
  };

  return (
    <>
      <div className="mb-1.5 sm:mb-2">
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {parts.slice(0, 4).map((part, index) => (
            <button
              key={index}
              onClick={() => handlePartClick(part, index)}
              className="bg-white rounded-lg shadow-md p-0.5 sm:p-1 flex flex-col items-center hover:shadow-lg active:shadow-md transition-shadow touch-manipulation aspect-square"
              aria-label={`View part ${index + 1}${part.part_name ? `: ${part.part_name}` : ''}`}
            >
              <img
                src={part.image}
                alt={`Lego part ${index + 1}${part.part_name ? `: ${part.part_name}` : ''}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Modal for enlarged view */}
      {selectedPart && selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Part {selectedIndex + 1} of {parts.length}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="flex justify-center mb-4">
                <img
                  src={selectedPart.image}
                  alt={`Lego part ${selectedIndex + 1}`}
                  className="max-w-full max-h-[60vh] object-contain"
                  loading="lazy"
                />
              </div>
              {selectedPart.color_name && (
                <div className="text-xs sm:text-sm text-gray-500 text-center mt-2">
                  Color: {selectedPart.color_name}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PuzzleDisplay;

