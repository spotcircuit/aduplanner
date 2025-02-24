'use client';

import { FC, useMemo } from 'react';
import { 
  HomeModernIcon, BuildingOfficeIcon, MapIcon,
  SunIcon, ShieldCheckIcon, TruckIcon,
  ExclamationCircleIcon, CheckCircleIcon, ArrowsPointingOutIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { VisionAnalysisResponse } from '@/lib/visionAnalysis';
import RawResponse from './RawResponse';

interface VisionAnalysisProps {
  isAnalyzing: boolean;
  visionAnalysis?: VisionAnalysisResponse;
}

interface RatingBadgeProps {
  rating: 'excellent' | 'good' | 'poor';
}

const RatingBadge: FC<RatingBadgeProps> = ({ rating }) => {
  const colors = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    poor: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[rating]}`}>
      {rating}
    </span>
  );
};

const VisionAnalysis: FC<VisionAnalysisProps> = ({ isAnalyzing, visionAnalysis }) => {
  // Show loading state
  if (isAnalyzing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-700">Analyzing property...</p>
      </div>
    );
  }

  // Return early if no analysis
  if (!visionAnalysis) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700">No analysis available. Upload a property image to begin.</p>
      </div>
    );
  }

  const { processed } = visionAnalysis;

  // Ensure we have the full analysis object
  if (!processed.structures || !processed.setbacks || !processed.buildableAreas) {
    console.error('Invalid analysis structure:', processed);
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-700">Error: Invalid analysis data structure</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Raw Response at the top */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5 text-gray-500" />
          Raw Analysis Response
        </h3>
        <RawResponse response={visionAnalysis.raw} />
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Existing Structures */}
          {processed.structures.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-100">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-blue-800">
                <HomeModernIcon className="h-5 w-5" />
                Existing Structures
              </h3>
              <div className="divide-y divide-blue-100">
                {processed.structures.map((structure, idx) => (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-blue-900">{structure.type}</h4>
                      <RatingBadge rating={structure.condition} />
                    </div>
                    <p className="text-sm text-blue-700 mt-1">{structure.location}</p>
                    <ul className="mt-2 space-y-1">
                      {structure.notes.map((note, noteIdx) => (
                        <li key={noteIdx} className="text-sm text-blue-600">• {note}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setbacks */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg shadow-lg p-6 border border-emerald-100">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-emerald-800">
              <ArrowsPointingOutIcon className="h-5 w-5" />
              Setbacks
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-emerald-700">Front</h4>
                <p className="text-2xl font-bold text-emerald-600">{processed.setbacks.front}ft</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-emerald-700">Back</h4>
                <p className="text-2xl font-bold text-emerald-600">{processed.setbacks.back}ft</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-emerald-700">Left</h4>
                <p className="text-2xl font-bold text-emerald-600">{processed.setbacks.left}ft</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-emerald-700">Right</h4>
                <p className="text-2xl font-bold text-emerald-600">{processed.setbacks.right}ft</p>
              </div>
            </div>
            {processed.setbacks.notes?.length > 0 && (
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-medium text-emerald-700">Notes</h4>
                <ul className="mt-2 space-y-1">
                  {processed.setbacks.notes.map((note, idx) => (
                    <li key={idx} className="text-sm text-emerald-600">• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Buildable Areas */}
          {processed.buildableAreas.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg shadow-lg p-6 border border-amber-100">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-amber-800">
                <MapIcon className="h-5 w-5" />
                Buildable Areas
              </h3>
              <div className="space-y-4">
                {processed.buildableAreas.map((area, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="font-medium text-amber-900">{area.location}</h4>
                        <p className="text-sm text-amber-700">{area.estimatedSize}</p>
                      </div>
                      <RatingBadge rating={area.suitability} />
                    </div>
                    <div className="mt-3 space-y-3">
                      {area.advantages.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-amber-700">Advantages</h5>
                          <ul className="mt-1">
                            {area.advantages.map((adv, idx) => (
                              <li key={idx} className="text-sm text-amber-600">• {adv}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {area.challenges.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-amber-700">Challenges</h5>
                          <ul className="mt-1">
                            {area.challenges.map((challenge, idx) => (
                              <li key={idx} className="text-sm text-amber-600">• {challenge}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Construction Suitability */}
          {(processed.constructionSuitability?.bestLocations?.length > 0 || processed.constructionSuitability?.generalNotes?.length > 0) && (
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-lg shadow-lg p-6 border border-purple-100">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-purple-800">
                <BuildingOfficeIcon className="h-5 w-5" />
                Construction Suitability
              </h3>
              <div className="space-y-4">
                {processed.constructionSuitability?.bestLocations?.map((location, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-purple-900">{location.location}</h4>
                      <RatingBadge rating={location.rating} />
                    </div>
                    <ul className="mt-2">
                      {location.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-purple-600">• {reason}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {processed.constructionSuitability?.generalNotes?.length > 0 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-purple-900 mb-2">General Notes</h4>
                    <ul className="space-y-1">
                      {processed.constructionSuitability.generalNotes.map((note, idx) => (
                        <li key={idx} className="text-sm text-purple-600">• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisionAnalysis;

