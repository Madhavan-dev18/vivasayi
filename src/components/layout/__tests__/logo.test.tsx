// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Logo } from '../logo';
import { LanguageProvider } from '@/context/LanguageContext';

describe('Logo Component', () => {
  it('renders the logo text correctly', () => {
    render(
      <LanguageProvider>
        <Logo />
      </LanguageProvider>
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Vivasayi');
  });
});
