'use client';

import { FC, useState } from 'react';
import { BuildingTemplate } from '@/types/building';

interface StructureTemplatesProps {
  onTemplateSelect: (template: BuildingTemplate) => void;
}

const BUILDING_TEMPLATES: BuildingTemplate[] = [
  // Standard Rectangles
  { name: "40x60 Shop", width: 40, length: 60, color: "#4CAF50" },
  { name: "30x40 Shop", width: 30, length: 40, color: "#2196F3" },
  { name: "24x36 Shop", width: 24, length: 36, color: "#9C27B0" },
  { name: "20x20 Shop", width: 20, length: 20, color: "#FF9800" },
];

const StructureTemplates: FC<StructureTemplatesProps> = ({ onTemplateSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BuildingTemplate | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-gray-200">
        {BUILDING_TEMPLATES.map((template) => {
          const sqFt = template.width * template.length;
          return (
            <button
              key={template.name}
              onClick={() => {
                setSelectedTemplate(template);
                onTemplateSelect(template);
              }}
              className={`p-3 w-full text-left transition-colors hover:bg-gray-50 ${
                selectedTemplate?.name === template.name ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded" 
                  style={{ 
                    backgroundColor: template.color,
                    opacity: 0.7,
                    aspectRatio: `${template.length}/${template.width}`
                  }}
                />
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-gray-600">
                    {template.width}' × {template.length}' ({sqFt.toLocaleString()} sq ft)
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StructureTemplates;
