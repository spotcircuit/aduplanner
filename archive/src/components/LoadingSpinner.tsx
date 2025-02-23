'use client';

import type { FC } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-16 w-16',
  lg: 'h-32 w-32'
};

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizes[size]}`}></div>
    </div>
  );
};

export default LoadingSpinner;
