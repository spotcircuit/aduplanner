'use client';

import { FC, useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface RawResponseProps {
  response: any;
}

const RawResponse: FC<RawResponseProps> = ({ response }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract JSON from the markdown response
  const extractedJson = useMemo(() => {
    if (!response || typeof response !== 'string') return null;
    
    // Find JSON between ```json and ``` markers
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('Failed to parse extracted JSON:', error);
        return null;
      }
    }
    return null;
  }, [response]);

  if (!response) return null;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
        Raw Response Data
      </button>
      
      {isExpanded && (
        <div className="h-[300px] overflow-auto border-t border-gray-200">
          <pre className="p-4 text-sm font-mono overflow-x-auto" style={{ wordWrap: 'break-word', whiteSpace: 'pre' }}>
            {extractedJson ? JSON.stringify(extractedJson, null, 2) : response}
          </pre>
        </div>
      )}
    </div>
  );
};

export default RawResponse;
