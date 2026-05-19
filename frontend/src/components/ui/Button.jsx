import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled, 
  onClick, 
  type = 'button' 
}) {
  let baseClass = 'btn';
  
  if (variant === 'success') baseClass += ' btn-success';
  if (variant === 'outline') baseClass += ' btn-outline';
  
  // Jeśli ma className typu 'w-full', to doda się tutaj
  const finalClass = `${baseClass} ${className}`.trim();

  return (
    <button 
      type={type}
      className={finalClass}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
