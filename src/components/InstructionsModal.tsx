interface InstructionsModalProps {
  onClose: () => void;
}

function InstructionsModal({ onClose }: InstructionsModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 id="instructions-title" className="text-xl sm:text-2xl font-bold text-gray-900">
            How to Play
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm sm:text-base text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Objective</h3>
            <p>Guess the Lego set by looking at the pieces shown. You have 5 guesses to identify the correct set.</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Gameplay</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Type your guess in the input field and select from autocomplete suggestions</li>
              <li>You'll see feedback after each guess showing how close you are</li>
              <li>Use hints to reveal more pieces or information (costs 10 points each)</li>
              <li>Try to guess correctly in as few attempts as possible for a higher score</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Hints</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Piece Hints:</strong> Reveal additional pieces from the set</li>
              <li><strong>Year:</strong> The year the set was released</li>
              <li><strong>Parts:</strong> Total number of pieces in the set</li>
              <li><strong>Theme:</strong> The theme category (e.g., Star Wars, City)</li>
              <li><strong>Letters:</strong> First letter of each word in the set name</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Feedback</h3>
            <p>After each wrong guess, you'll see:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Shared Parts:</strong> How many pieces match between your guess and the answer</li>
              <li><strong>Year Match:</strong> Whether the year matches (✓), is in the same decade (✓), or is different (✗)</li>
              <li><strong>Theme Match:</strong> Whether the theme matches</li>
              <li><strong>Name Similarity:</strong> How similar the names are</li>
              <li><strong>Color Overlap:</strong> How many colors match between the sets</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Scoring</h3>
            <p>Your score is based on:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Number of guesses (fewer is better)</li>
              <li>Number of hints used (fewer is better)</li>
              <li>Maximum score is 100 points</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 sm:mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold min-h-[48px] touch-manipulation"
          aria-label="Close instructions"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

export default InstructionsModal;

