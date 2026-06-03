import React from 'react';

export default function ScannerOverlay() {
  return (
    <div
      className="scan-flash-overlay absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden transition-opacity duration-300"
      style={{ opacity: 0 }}
    >
      <div className="absolute inset-0 border-4 border-green-400 rounded-xl" />
      <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1.5 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    </div>
  );
}