import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function useOperationLogsPage() {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  
  // Left Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  const navigate = useNavigate();

  const selectedEquipment = useMemo(
    () => equipmentList.find((eq) => eq.id === selectedEqId),
    [equipmentList, selectedEqId]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [eqs, locs] = await Promise.all([
        api.getEquipment(),
        api.getLocations().catch(() => []),
      ]);
      const eqArray = Array.isArray(eqs) ? eqs : eqs.items || [];
      setEquipmentList(eqArray);
      setLocations(Array.isArray(locs) ? locs : []);

      // Auto-select first equipment if not selected
      if (eqArray.length > 0 && !selectedEqId) {
        setSelectedEqId(eqArray[0].id);
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // QR Scanner Effect: resolves equipment by code, id or URL and opens form
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          try {
            scanner.clear().catch(console.error);
            setShowScanner(false);

            let rawText = decodedText.trim();
            
            // Try parsing JSON if QR holds JSON
            if (rawText.startsWith('{') && rawText.endsWith('}')) {
              try {
                const parsed = JSON.parse(rawText);
                rawText = parsed.code || parsed.equipmentCode || parsed.equipmentId || parsed.id || rawText;
              } catch (_) {}
            }

            // Extract from URL if QR is a URL
            if (rawText.includes('/equipment/')) {
              const match = rawText.match(/\/equipment\/([^/?#]+)/);
              if (match) rawText = match[1];
            } else {
              rawText = rawText
                .replace(/^cmms-equipment:/i, '')
                .replace(/^equipment:/i, '')
                .replace(/^equipment\//i, '')
                .trim();
            }

            if (rawText.includes('$')) {
              rawText = rawText.split('$')[0].trim();
            }

            // Look up in equipmentList by code, accountingCode or id
            let matchedEq = equipmentList.find(
              (eq) =>
                eq.id?.toLowerCase() === rawText.toLowerCase() ||
                eq.code?.toLowerCase() === rawText.toLowerCase() ||
                eq.accountingCode?.toLowerCase() === rawText.toLowerCase()
            );

            // Fallback: search via API if not found in current list
            if (!matchedEq) {
              try {
                const searchRes = await api.getEquipment({ search: rawText });
                const searchItems = Array.isArray(searchRes) ? searchRes : searchRes?.items || [];
                matchedEq = searchItems.find(
                  (eq: any) =>
                    eq.id?.toLowerCase() === rawText.toLowerCase() ||
                    eq.code?.toLowerCase() === rawText.toLowerCase() ||
                    eq.accountingCode?.toLowerCase() === rawText.toLowerCase()
                ) || searchItems[0];
              } catch (_) {}
            }

            if (matchedEq) {
              // Automatically open the operation log recording form for the scanned equipment
              navigate(`/equipment/${matchedEq.id}/operation-log-form`, {
                state: { verifiedByQr: true, scannedAt: new Date().toISOString() },
              });
            } else {
              alert(`Không tìm thấy thiết bị với mã QR: "${rawText}". Vui lòng kiểm tra lại tem QR trên máy.`);
            }
          } catch (err: any) {
            console.error('Lỗi xử lý QR:', err);
            alert('Lỗi khi xử lý mã QR.');
          }
        },
        () => {}
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner, equipmentList, navigate]);

  // THUẬT TOÁN TỐI ƯU HÓA: Memoized Search Filter O(N)
  const filteredEquipment = useMemo(() => {
    const term = search.trim().toLowerCase();
    return equipmentList.filter((eq) => {
      const matchLoc = selectedLocation === 'ALL' || eq.location === selectedLocation;
      if (!matchLoc) return false;
      if (!term) return true;
      return (
        eq.code?.toLowerCase().includes(term) ||
        eq.name?.toLowerCase().includes(term) ||
        eq.category?.toLowerCase().includes(term)
      );
    });
  }, [equipmentList, selectedLocation, search]);

  return {
    // Data
    equipmentList,
    locations,
    loading,
    filteredEquipment,
    selectedEquipment,

    // Selection
    selectedEqId,
    setSelectedEqId,

    // Sidebar
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    search,
    setSearch,
    selectedLocation,
    setSelectedLocation,

    // Scanner
    showScanner,
    setShowScanner,

    // Actions
    fetchData,
    navigate,
  };
}
