import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';

interface UseUtilityPointScannerOptions {
  selectedPoint: any | null;
  onSelectPoint: (point: any) => void;
}

export function useUtilityPointScanner({
  selectedPoint,
  onSelectPoint,
}: UseUtilityPointScannerOptions): {
  scanning: boolean;
  setScanning: Dispatch<SetStateAction<boolean>>;
} {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [points, setPoints] = useState<any[]>([]);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const data = await api.getUtilityPoints({ isActive: true });
        const list = Array.isArray(data) ? data : [];
        setPoints(list);

        const queryCode = searchParams.get('code') || searchParams.get('id');
        if (!queryCode) return;
        const match = list.find((point) => point.code === queryCode || point.id === queryCode);
        if (match) {
          onSelectPoint(match);
          setScanning(false);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách điểm đo:', error);
      }
    };

    fetchPoints();
  }, [searchParams, onSelectPoint]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (!scanning || selectedPoint) return;

    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'utility-qr-reader',
          { fps: 10, qrbox: { width: 220, height: 220 } },
          false,
        );

        scanner.render(
          async (decodedText: string) => {
            try {
              scanner?.clear().catch(console.error);
              setScanning(false);
              let text = decodedText.trim();

              if (text.startsWith('{') && text.endsWith('}')) {
                try {
                  const parsed = JSON.parse(text);
                  text = parsed.code || parsed.id || text;
                } catch {}
              }

              const cleanCode = text.replace(/^UTILITY:(ELEC|WATER|SYS):/i, '');
              const found = points.find(
                (point) =>
                  point.code.toUpperCase() === cleanCode.toUpperCase()
                  || point.code.toUpperCase() === text.toUpperCase()
                  || point.id === text,
              );

              if (found) {
                onSelectPoint(found);
                return;
              }

              try {
                const response = await api.getUtilityPointByIdOrCode(cleanCode);
                if (response) onSelectPoint(response);
              } catch {
                toast.error('Không tìm thấy', 'Mã QR [' + cleanCode + '] chưa được đăng ký trong hệ thống tiện ích.');
                setScanning(true);
              }
            } catch (error) {
              console.error(error);
            }
          },
          () => {},
        );
      } catch (error) {
        console.error('Lỗi khởi tạo máy quét:', error);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      scanner?.clear().catch(console.error);
    };
  }, [scanning, selectedPoint, points, onSelectPoint, toast]);

  return { scanning, setScanning };
}
