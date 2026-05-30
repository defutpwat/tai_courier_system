import React from 'react';
import styled from 'styled-components';

const StyledGlassCard = styled.div`
  background: var(--card-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
  }

  h3 {
    margin-top: 0;
    color: var(--primary-color);
  }
`;

export function GlassCard({ children, title, className = '', style = {} }) {
  return (
    <StyledGlassCard className={className} style={style}>
      {title && <h3>{title}</h3>}
      {children}
    </StyledGlassCard>
  );
}
