import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  margin: 0.5rem 0 1rem 0;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 0.75rem 2.4rem 0.75rem 0.75rem;
  margin: 0;
  border: 1px solid ${p => p.$status === 'valid' ? '#10b981' : p.$status === 'invalid' ? '#ef4444' : '#D1D5DB'};
  border-radius: 8px;
  box-sizing: border-box;
  background: rgba(255,255,255,0.9);
  color: var(--text-main);
  transition: border-color 0.2s;

  body.dark-theme & {
    background: rgba(31, 41, 55, 0.9);
    border-color: ${p => p.$status === 'valid' ? '#10b981' : p.$status === 'invalid' ? '#ef4444' : '#374151'};
  }
`;

const StatusIcon = styled.span`
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  font-weight: 700;
  color: ${p => p.$valid ? '#10b981' : '#ef4444'};
  pointer-events: none;
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  z-index: 99999;
  background: var(--card-bg, #fff);
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 220px;
  overflow-y: auto;

  body.dark-theme & {
    background: #1f2937;
    border-color: rgba(255,255,255,0.1);
  }
`;

const DropdownItem = styled.li`
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--text-main);
  line-height: 1.35;

  &:hover, &.active {
    background: rgba(255,77,77,0.09);
    color: var(--primary-color, #ff4d4d);
  }
`;

export function AddressInput({ placeholder, value, onChange, required, disabled, style = {} }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [status, setStatus] = useState(null); // null | 'valid' | 'invalid'
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Zamknij dropdown po kliknięciu poza komponentem
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Resetuj status walidacji przy zmianie wartości z zewnątrz
  useEffect(() => {
    setStatus(null);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(e);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);

    if (val.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await api.autocompleteAddress(val);
          const list = data.suggestions || [];
          setSuggestions(list);
          setShowDropdown(list.length > 0);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (suggestion) => {
    onChange({ target: { value: suggestion } });
    setSuggestions([]);
    setShowDropdown(false);
    setStatus('valid');
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleBlur = () => {
    // Opóźnienie, żeby kliknięcie na sugestię zdążyło się obsłużyć
    setTimeout(async () => {
      setShowDropdown(false);
      if (!value || value.length < 5) return;
      try {
        const data = await api.validateAddress(value);
        setStatus(data.valid ? 'valid' : 'invalid');
      } catch {
        setStatus(null);
      }
    }, 160);
  };

  return (
    <Wrapper ref={wrapperRef}>
      <StyledInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        style={style}
        autoComplete="off"
        $status={status}
      />
      {status === 'valid'   && <StatusIcon $valid>✓</StatusIcon>}
      {status === 'invalid' && <StatusIcon>!</StatusIcon>}
      {showDropdown && (
        <Dropdown>
          {suggestions.map((s, i) => (
            <DropdownItem
              key={i}
              className={i === activeIdx ? 'active' : ''}
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </Wrapper>
  );
}
