// src/components/common/SkeletonLoader.js
"use client"; // If it uses client-side hooks like useState or dynamic styles

import React from 'react';

// A simple utility for drawing a pulsating skeleton shape
// You can expand this with more complex shapes (circles, rows, etc.)
export function SkeletonRect({ width = '100%', height = '1rem', className = '', style = {} }) {
  return (
    <div
      className={`skeleton-rect ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonCircle({ size = '1rem', className = '', style = {} }) {
  return (
    <div
      className={`skeleton-circle ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}

// Basic CSS for the skeleton effect (you'll add this to your global.css or a dedicated CSS file)
/*

*/