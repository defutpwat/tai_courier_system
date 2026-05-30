import React from 'react';
import styled, { css } from 'styled-components';

const StyledButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;

  &:hover {
    background-color: var(--primary-hover);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${({ $variant }) => $variant === 'success' && css`
    background-color: var(--success);
    &:hover { background-color: #059669; }
  `}

  ${({ $variant }) => $variant === 'outline' && css`
    background-color: transparent;
    color: var(--text-main);
    border: 1px solid var(--text-main);
    &:hover {
      background-color: var(--text-main);
      color: var(--bg-color);
    }
  `}
`;

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled, 
  onClick, 
  type = 'button' 
}) {
  return (
    <StyledButton 
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      $variant={variant}
    >
      {children}
    </StyledButton>
  );
}
