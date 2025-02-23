'use client';

import { FC, useMemo } from 'react';
import { 
  HomeModernIcon,
  MapIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  HomeIcon,
  SunIcon,
  UserGroupIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'; 
import RawResponse from './RawResponse';

interface VisionAnalysisProps {
  isAnalyzing: boolean;
  visionAnalysis: any;  
}

const VisionAnalysis: FC<VisionAnalysisProps> = ({ 
  isAnalyzing,
  visionAnalysis
}) => {
  const parsedData = useMemo(() => {
    if (!visionAnalysis) {
      console.log('No vision analysis data');
      return null;
    }

    console.log('Raw vision analysis:', visionAnalysis);

    // If it's already an object, return it
    if (typeof visionAnalysis === 'object') {
      console.log('Vision analysis is already an object:', visionAnalysis);
      return visionAnalysis;
    }

    // If it's a string, try to parse it
    if (typeof visionAnalysis === 'string') {
      try {
        // First try to parse it directly as JSON
        const directParse = JSON.parse(visionAnalysis);
        console.log('Successfully parsed direct JSON:', directParse);
        return directParse;
      } catch (error) {
        console.log('Direct JSON parse failed, trying to extract JSON from markdown');
        
        // Try to extract JSON from markdown format
        const jsonMatch = visionAnalysis.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsedFromMarkdown = JSON.parse(jsonMatch[1]);
            console.log('Successfully parsed JSON from markdown:', parsedFromMarkdown);
            return parsedFromMarkdown;
          } catch (error) {
            console.error('Failed to parse JSON from markdown:', error);
          }
        }
      }
    }

    console.error('Failed to parse vision analysis data');
    return null;
  }, [visionAnalysis]);

  if (isAnalyzing) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-700">Analyzing property...</p>
      </div>
    );
  }

  if (!visionAnalysis) {
    return null;
  }

  if (!parsedData) {
    console.log('No parsed data available');
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">No analysis data available</p>
        <pre className="mt-4 p-4 bg-gray-50 rounded text-sm overflow-auto">
          {JSON.stringify(visionAnalysis, null, 2)}
        </pre>
      </div>
    );
  }

  console.log('Parsed Data:', parsedData);

  return (
    <div className="space-y-6">
      <RawResponse response={visionAnalysis} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Analysis */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <HomeModernIcon className="h-5 w-5 text-blue-500" />
            Property Overview
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="ml-1 text-gray-900">{parsedData?.propertyAnalysis?.propertyType ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Size:</span>
                <span className="ml-1 text-gray-900">{parsedData?.propertyAnalysis?.lotSize ?? 'N/A'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-blue-100">
              <div className="text-sm">
                <span className="text-gray-600">Sun Orientation:</span>
                <span className="ml-1 text-gray-900">{parsedData?.propertyAnalysis?.cardinalDirections ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ADA Compliance */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-green-500" />
            ADA Compliance
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="text-gray-600">Compliance:</span>
                <span className="ml-1 text-gray-900">{parsedData?.adaComplianceConsiderations?.estimatedADACompliance ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">General:</span>
                <span className="ml-1 text-gray-900">{parsedData?.adaComplianceConsiderations?.generalAccessibility ?? 'N/A'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-green-100">
              <h4 className="text-sm font-medium text-green-700 mb-2">Features Impact</h4>
              <ul className="list-disc list-inside space-y-1">
                <li className="text-sm text-gray-700">Steps: {parsedData?.adaComplianceConsiderations?.existingFeaturesImpact?.steps ?? 'N/A'}</li>
                <li className="text-sm text-gray-700">Grades: {parsedData?.adaComplianceConsiderations?.existingFeaturesImpact?.steepGrades ?? 'N/A'}</li>
                <li className="text-sm text-gray-700">Side Yards: {parsedData?.adaComplianceConsiderations?.existingFeaturesImpact?.narrowSideYards ?? 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Measurements & Setbacks */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ArrowsPointingOutIcon className="h-5 w-5 text-purple-500" />
            Measurements & Setbacks
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm">
                <span className="text-gray-600">Front:</span>
                <span className="ml-1 text-gray-900">{parsedData?.setbackAndBuildableAreaAnalysis?.frontYard ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Back:</span>
                <span className="ml-1 text-gray-900">{parsedData?.setbackAndBuildableAreaAnalysis?.backYard ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Left:</span>
                <span className="ml-1 text-gray-900">{parsedData?.setbackAndBuildableAreaAnalysis?.sideYard?.left ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Right:</span>
                <span className="ml-1 text-gray-900">{parsedData?.setbackAndBuildableAreaAnalysis?.sideYard?.right ?? 'N/A'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-purple-100">
              <h4 className="text-sm font-medium text-purple-700 mb-2">Buildable Area</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">
                  <span className="text-gray-600">Width:</span>
                  <span className="ml-1 text-gray-900">{parsedData?.measurements?.buildableAreaDimensions?.width ?? 'N/A'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Depth:</span>
                  <span className="ml-1 text-gray-900">{parsedData?.measurements?.buildableAreaDimensions?.depth ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ADU Placement */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-amber-500" />
            ADU Placement
          </h3>
          <div className="space-y-4">
            <div className="text-sm">
              <span className="text-gray-600">Optimal Location:</span>
              <span className="ml-1 text-gray-900">{parsedData?.aduPlacementConsiderations?.optimalLocations ?? 'N/A'}</span>
            </div>
            <div className="pt-2 border-t border-amber-100">
              <h4 className="text-sm font-medium text-amber-700 mb-2">Constraints</h4>
              <div className="text-sm text-gray-700">{parsedData?.aduPlacementConsiderations?.obstacles ?? 'No constraints listed'}</div>
            </div>
            <div className="pt-2 border-t border-amber-100">
              <div className="text-sm">
                <span className="text-gray-600">Privacy:</span>
                <span className="ml-1 text-gray-900">{parsedData?.aduPlacementConsiderations?.privacyFactors ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Features */}
        <div className="md:col-span-2 bg-gradient-to-r from-sky-50 to-sky-100 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-sky-500" />
            Existing Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-sky-700 mb-2">Structures</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">Main House:</span>
                  <span className="ml-1 text-gray-900">
                    {parsedData?.existingStructuresAndFeatures?.mainHouseSize ?? 'N/A'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Other:</span>
                  <span className="ml-1 text-gray-900">
                    {parsedData?.existingStructuresAndFeatures?.otherStructures ?? 'None'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-sky-700 mb-2">Landscaping</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-600">Trees:</span>
                  <span className="ml-1 text-gray-900">
                    {parsedData?.existingStructuresAndFeatures?.treesLandscaping ?? 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-sky-700 mb-2">Access</h4>
              <div className="text-sm">
                <span className="text-gray-600">Parking:</span>
                <span className="ml-1 text-gray-900">
                  {parsedData?.existingStructuresAndFeatures?.drivewaysParkingAreas?.drivewayType ?? 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionAnalysis;
