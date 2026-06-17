import React, { useState } from 'react';
import styled from 'styled-components';

// Marginesy na Wrapper (nie na input), żeby top:50% button trafiał w środek inputa
const Wrapper = styled.div`
  position: relative;
  width: 100%;
  margin: 0.5rem 0 1rem 0;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.75rem 2.8rem 0.75rem 0.75rem;
  margin: 0;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.9);
  color: var(--text-main);

  body.dark-theme & {
    background: rgba(31, 41, 55, 0.9);
    border-color: #374151;
  }
`;

const ToggleBtn = styled.button`
  position: absolute;
  right: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  line-height: 1;

  &:hover { color: var(--text-main); }
  &:focus { outline: none; }
`;

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// Dozwolone: drukowalne ASCII bez spacji (0x21–0x7E)
// Blokuje: spacje, polskie litery, cyrylicę, emoji, itp.
function filterPassword(value) {
  return value.replace(/[^\x21-\x7E]/g, '');
}

export function PasswordInput({ placeholder, value, onChange, required, disabled, style = {}, className = '' }) {
  const [show, setShow] = useState(false);

  const handleChange = (e) => {
    const filtered = filterPassword(e.target.value);
    onChange({ ...e, target: { ...e.target, value: filtered } });
  };

  return (
    <Wrapper>
      <StyledInput
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className={className}
        style={style}
        autoComplete="new-password"
      />
      <ToggleBtn type="button" tabIndex={-1} onClick={() => setShow(s => !s)} title={show ? 'Ukryj hasło' : 'Pokaż hasło'}>
        {show ? <EyeOpen /> : <EyeClosed />}
      </ToggleBtn>
    </Wrapper>
  );
}
