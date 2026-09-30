import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { UtilityCumulativeHeader } from './UtilityCumulativeHeader';
import { UtilityCumulativeMetersTable } from './UtilityCumulativeMetersTable';
import { UtilityCumulativeSummary } from './UtilityCumulativeSummary';
import { UtilityCumulativeTrendSection } from './UtilityCumulativeTrendSection';

interface UtilityTabProps {
  model: UtilitiesPageViewModel;
}

export const UtilityCumulativeTab: React.FC<UtilityTabProps> = ({ model }) => (
  <div className="util-tab-content">
    <UtilityCumulativeHeader model={model} />
    <UtilityCumulativeSummary model={model} />
    <UtilityCumulativeMetersTable model={model} />
    <UtilityCumulativeTrendSection model={model} />
  </div>
);
