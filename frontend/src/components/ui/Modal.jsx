import React from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalBox = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  color: var(--text-main);

  body.dark-theme & {
    background: #1f2937;
  }

  h3 {
    margin-top: 0;
    color: var(--primary-color);
  }
`;

export function Modal({ isOpen, onClose, title, children, width }) {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()} style={width ? { width, maxWidth: '95vw' } : { maxWidth: '95vw' }}>
        {title && <h3>{title}</h3>}
        {children}
      </ModalBox>
    </ModalOverlay>
  );
}
