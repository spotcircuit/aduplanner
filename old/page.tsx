'use client';

import ADUPlannerClient from './components/ADUPlannerClient';
import { HomeModernIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500 opacity-5 pattern-grid-lg"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center space-y-8">
            {/* Logo and Title */}
            <div className="flex justify-center items-center space-x-3 mb-6">
              <HomeModernIcon className="w-12 h-12 text-blue-500 animate-pulse" />
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                ADU Planner
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto">
              Design your perfect Accessory Dwelling Unit with our intelligent planning assistant
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                Instant Eligibility Check
              </span>
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">
                Visual Property Planning
              </span>
              <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">
                Smart Measurements
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <ADUPlannerClient />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-gray-500 text-sm">
        <p> 2024 ADU Planner. All rights reserved.</p>
        <p className="mt-2">Results are preliminary. Always verify with local authorities.</p>
      </footer>
    </main>
  );
}
