import React from 'react';
import { useUtilitySettings } from '../../hooks/useUtilitySettings';
import { UtilitySettingsControls } from './UtilitySettingsControls';
import { UtilitySupplyMetersSection } from './UtilitySupplyMetersSection';
import { UtilityMetersTableSection } from './UtilityMetersTableSection';

export const UtilitySettingsTab: React.FC = () => {
  const {
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    loading, savingId, batchSaving, elecCycle, waterCycle, supplyMeters,
    search, setSearch, filterType, setFilterType, editValues, filteredMeters,
    loadPeriodData, handleValueChange, handleCurrentValueChange, handleNotesChange,
    handleSaveSingle, handleSaveAll, handleAutoFillFromHistory,
  } = useUtilitySettings();

  return (
    <div>
      <UtilitySettingsControls
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        loading={loading}
        batchSaving={batchSaving}
        elecCycle={elecCycle}
        waterCycle={waterCycle}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onAutoFill={handleAutoFillFromHistory}
        onReload={loadPeriodData}
        onSaveAll={handleSaveAll}
      />

      <UtilitySupplyMetersSection
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        loading={loading}
        savingId={savingId}
        batchSaving={batchSaving}
        supplyMeters={supplyMeters}
        editValues={editValues}
        onValueChange={handleValueChange}
        onCurrentValueChange={handleCurrentValueChange}
        onNotesChange={handleNotesChange}
        onSave={handleSaveSingle}
      />

      <UtilityMetersTableSection
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        loading={loading}
        savingId={savingId}
        batchSaving={batchSaving}
        filteredMeters={filteredMeters}
        editValues={editValues}
        search={search}
        filterType={filterType}
        setSearch={setSearch}
        setFilterType={setFilterType}
        handleValueChange={handleValueChange}
        handleCurrentValueChange={handleCurrentValueChange}
        handleNotesChange={handleNotesChange}
        handleSaveSingle={handleSaveSingle}
      />
    </div>
  );
};
