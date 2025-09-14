import React from 'react';
import { Timeframe } from '../types/trading';

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
  className?: string;
}

const defaultTimeframes: { label: string; value: Timeframe }[] = [
  { label: '1H', value: '1h' },
  { label: '2H', value: '2h' },
  { label: '3H', value: '3h' },
  { label: '4H', value: '4h' },
  { label: '6H', value: '6h' },
  { label: '8H', value: '8h' },
  { label: '12H', value: '12h' },
  { label: '18H', value: '18h' },
  { label: '1D', value: '1d' },
  { label: '2D', value: '2d' },
  { label: '3D', value: '3d' },
  { label: '4D', value: '4d' },
  { label: '1W', value: '1w' },
  { label: '6D', value: '6d' },
  { label: '7D', value: '7d' },
  { label: '2W', value: '2w' },
  { label: '3W', value: '3w' },
  { label: '1M', value: '1M' },
  { label: '5W', value: '5w' },
  { label: '6W', value: '6w' },
  { label: '2M', value: '2M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' }
];

export function TimeframeSelector({ selectedTimeframe, onTimeframeChange, className = '' }: TimeframeSelectorProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <div className="flex flex-wrap gap-1">
        {defaultTimeframes.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onTimeframeChange(value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-all duration-500 ease-out border ${
              selectedTimeframe === value
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm transform scale-105'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:scale-102'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}