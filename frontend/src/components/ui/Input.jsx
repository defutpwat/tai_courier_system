import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin: 0.5rem 0 1rem 0;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.9);
  color: var(--text-main);

  body.dark-theme & {
    background: rgba(31, 41, 55, 0.9);
    border-color: #374151;
  }

  body.dark-theme &::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
`;

export function Input({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  required, 
  disabled,
  className = '',
  step,
  style = {}
}) {
  return (
    <StyledInput 
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={className}
      step={step}
      style={style}
    />
  );
}
