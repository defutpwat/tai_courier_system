import React from 'react';

export function GlassCard({ children, title, className = '', style = {} }) {
  return (
    <div className={`glass-container ${className}`.trim()} style={style}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}
