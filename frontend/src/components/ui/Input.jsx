import React from 'react';

export function Input({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  required, 
  disabled,
  className = '',
  step
}) {
  return (
    <input 
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={className}
      step={step}
    />
  );
}
