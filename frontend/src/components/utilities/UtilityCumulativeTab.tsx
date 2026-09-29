import React from 'react';
import { UtilityCumulativeHeader } from './UtilityCumulativeHeader';
import { UtilityCumulativeMetersTable } from './UtilityCumulativeMetersTable';
import { UtilityCumulativeSummary } from './UtilityCumulativeSummary';
import { UtilityCumulativeTrendSection } from './UtilityCumulativeTrendSection';

interface UtilityTabProps {
  model: Record<string, any>;
}

export const UtilityCumulativeTab: React.FC<UtilityTabProps> = ({ model }) => (
  <div className="util-tab-content">
    <UtilityCumulativeHeader model={model} />
    <UtilityCumulativeSummary model={model} />
    <UtilityCumulativeMetersTable model={model} />
    <UtilityCumulativeTrendSection model={model} />
  </div>
);
