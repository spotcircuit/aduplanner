'use client';

import { 
  PencilSquareIcon as PencilIcon,
  ArrowsPointingInIcon,
  ArrowsUpDownIcon,
  RectangleStackIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface DrawingInstructionsProps {
  isVisible: boolean;
}

const DrawingInstructions: React.FC<DrawingInstructionsProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <LightBulbIcon className="h-6 w-6 text-blue-500" />
        Drawing Instructions
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-gray-700 font-medium flex items-center gap-2">
            <PencilIcon className="h-5 w-5 text-blue-500" /> 1. Start Drawing
          </p>
          <p className="text-gray-600 pl-4">Click the "Draw" button to activate the drawing tool</p>
          <p className="text-gray-700 font-medium mt-4 flex items-center gap-2">
            <ArrowsPointingInIcon className="h-5 w-5 text-blue-500" /> 2. Create Your Line
          </p>
          <p className="text-gray-600 pl-4">Click once on the map to set your starting point</p>
          <p className="text-gray-600 pl-4">Click again to set your ending point</p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-700 font-medium flex items-center gap-2">
            <ArrowsUpDownIcon className="h-5 w-5 text-blue-500" /> 3. Adjust Your Line
          </p>
          <p className="text-gray-600 pl-4">Drag either endpoint to modify the line length</p>
          <p className="text-gray-600 pl-4">Drag the middle of the line to move it entirely</p>
          <p className="text-gray-700 font-medium mt-4 flex items-center gap-2">
            <RectangleStackIcon className="h-5 w-5 text-blue-500" /> 4. View Measurements
          </p>
          <p className="text-gray-600 pl-4">Distance and area measurements update automatically</p>
          <p className="text-gray-600 pl-4">Use the "Clear" button to start over if needed</p>
        </div>
      </div>
    </div>
  );
};

export default DrawingInstructions;
