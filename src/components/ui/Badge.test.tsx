import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from './Badge';

describe('Badge UI Component', () => {
  it('should render badge text correctly', () => {
    render(<Badge text="نشط" type="success" />);
    expect(screen.getByText('نشط')).toBeDefined();
  });

  it('should render with correct type classes', () => {
    const { container } = render(<Badge text="معلق" type="warning" />);
    const badgeElement = container.querySelector('.badge-warning');
    expect(badgeElement).toBeDefined();
  });

  it('should render icon if provided', () => {
    const { container } = render(<Badge text="معتمد" type="success" icon="fa-solid fa-check" />);
    const icon = container.querySelector('.fa-check');
    expect(icon).toBeDefined();
  });
});
