import React from 'react';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex justify-center items-center" onClick={onClose} style={{zIndex: 9999}}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
