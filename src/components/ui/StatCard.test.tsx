import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatCard } from './StatCard';

describe('StatCard Component', () => {
  it('should render title, value, and subtext properly', () => {
    render(
      <StatCard
        title="إجمالي العقود"
        value="1,250 عقد"
        subtext="نمو 12% عن الشهر الماضي"
        icon="fa-solid fa-file-contract"
        variant="teal"
      />
    );

    expect(screen.getByText('إجمالي العقود')).toBeDefined();
    expect(screen.getByText('1,250 عقد')).toBeDefined();
    expect(screen.getByText('نمو 12% عن الشهر الماضي')).toBeDefined();
  });
});
