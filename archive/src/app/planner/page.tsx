"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the PropertyPlanner component to avoid SSR issues with Google Maps
const PropertyPlanner = dynamic(() => import('@/components/PropertyPlanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function PlannerPage() {
  return (
    <main className="min-h-screen">
      <Suspense>
        <PropertyPlanner />
      </Suspense>
    </main>
  );
}
