import React from 'react';
import {
  BarChart2, BarChart3, Calendar, CalendarDays, ChevronLeft, ChevronRight,
  Clock, FileText, Filter, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { ExportButton } from '../common';
import { formatVN } from '../../utils/formatters';
import { UtilityTrendChart } from './UtilityTrendChart';

interface UtilityCumulativeTrendSectionProps {
  model: Record<string, any>;
}

export const UtilityCumulativeTrendSection: React.FC<UtilityCumulativeTrendSectionProps> = ({ model }) => {
  const {
    cumulativeType, trendViewMode, setTrendViewMode, trendDay, setTrendDay,
    trendMonth, setTrendMonth, trendYear, setTrendYear, trendStartYear,
    setTrendStartYear, trendEndYear, setTrendEndYear, trendFilter, setTrendFilter,
    trendData, trendLoading, trendDisplayType, setTrendDisplayType,
    trendTableContainerRef, dynamicYears, scrollTrendTable, scrollToPeriod,
    handleExportTrendCSV, displayedTrendRows,
  } = model;

  return (
    <>
{/* 4. BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN (MA TRẬN NGÀY / THÁNG / NĂM) */}
<div className="card util-section-card trend-matrix-card" style={{ marginTop: '24px' }}>
  <div className="trend-card-header">
    <div className="trend-title-box">
      <h3 className="section-title">
        <BarChart3 size={18} color="#059669" />
        <span>BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN</span>
      </h3>
      <p className="section-sub">
        Chi tiết sản lượng tiêu thụ của từng vị trí / điểm đo qua các ngày trong tháng, các tháng trong năm hoặc so sánh giữa các năm.
      </p>
    </div>

    {/* Nút Chuyển Đổi Dạng Xem: Bảng Số Liệu <-> Biểu Đồ Trực Quan */}
    <div className="trend-view-type-pills">
      <button
        type="button"
        onClick={() => setTrendDisplayType('TABLE')}
        className={`view-type-btn ${trendDisplayType === 'TABLE' ? 'active' : ''}`}
        title="Xem dạng bảng ma trận số liệu chi tiết"
      >
        <FileText size={13} />
        <span>Dạng Bảng Số</span>
      </button>
      <button
        type="button"
        onClick={() => setTrendDisplayType('CHART')}
        className={`view-type-btn ${trendDisplayType === 'CHART' ? 'active' : ''}`}
        title="Chuyển sang dạng biểu đồ đồ thị trực quan"
      >
        <BarChart2 size={13} />
        <span>Dạng Biểu Đồ</span>
      </button>
    </div>
  </div>

  {/* Thanh Công Cụ Điều Khiển & Bộ Lọc Tự Co Giãn Theo Màn Hình */}
  <div className="trend-toolbar">
    <div className="trend-toolbar-left">
      {/* 1. Nút chuyển chế độ: Giờ / Ngày / Tháng / Năm */}
      <div className="trend-mode-pills">
        <button
          type="button"
          onClick={() => setTrendViewMode('HOURLY')}
          className={`trend-mode-btn ${trendViewMode === 'HOURLY' ? 'active' : ''}`}
          title="Xem chi tiết từng giờ trong ngày"
        >
          <Clock size={13} />
          <span>Theo Giờ</span>
        </button>
        <button
          type="button"
          onClick={() => setTrendViewMode('DAILY')}
          className={`trend-mode-btn ${trendViewMode === 'DAILY' ? 'active' : ''}`}
        >
          <Calendar size={13} />
          <span>Theo Ngày</span>
        </button>
        <button
          type="button"
          onClick={() => setTrendViewMode('MONTHLY')}
          className={`trend-mode-btn ${trendViewMode === 'MONTHLY' ? 'active' : ''}`}
        >
          <CalendarDays size={13} />
          <span>Theo Tháng</span>
        </button>
        <button
          type="button"
          onClick={() => setTrendViewMode('YEARLY')}
          className={`trend-mode-btn ${trendViewMode === 'YEARLY' ? 'active' : ''}`}
        >
          <TrendingUp size={13} />
          <span>Theo Năm</span>
        </button>
      </div>

      {/* 2. Bộ chọn mốc thời gian */}
      {trendViewMode === 'HOURLY' && (
        <div className="trend-date-selectors">
          <select
            value={trendDay}
            onChange={(e) => setTrendDay(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
            title="Chọn ngày"
          >
            {Array.from({ length: new Date(trendYear, trendMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Ngày {String(d).padStart(2, '0')}</option>
            ))}
          </select>
          <select
            value={trendMonth}
            onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
            title="Chọn tháng"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
            ))}
          </select>
          <select
            value={trendYear}
            onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
            title="Chọn năm"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      )}

      {trendViewMode === 'DAILY' && (
        <div className="trend-date-selectors">
          <select
            value={trendMonth}
            onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
            ))}
          </select>
          <select
            value={trendYear}
            onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      )}

      {trendViewMode === 'MONTHLY' && (
        <div className="trend-date-selectors">
          <select
            value={trendYear}
            onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      )}

      {trendViewMode === 'YEARLY' && (
        <div className="trend-date-selectors">
          <span style={{ fontSize: '12px', color: '#64748b' }}>Từ:</span>
          <select
            value={trendStartYear}
            onChange={(e) => setTrendStartYear(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span style={{ fontSize: '12px', color: '#64748b' }}>đến:</span>
          <select
            value={trendEndYear}
            onChange={(e) => setTrendEndYear(parseInt(e.target.value, 10))}
            className="filter-select trend-select"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}
    </div>

    <div className="trend-toolbar-right">
      {/* 3. Bộ lọc điểm đo (Flat, không hard code) */}
      <div className="trend-filter-box">
        <Filter size={13} className="trend-filter-icon" />
        <select
          value={trendFilter}
          onChange={(e) => setTrendFilter(e.target.value)}
          className="filter-select trend-filter-select"
          title="Lọc vị trí / điểm đo hiển thị"
        >
          <option value="ALL">Tất cả điểm đo ({trendData?.pointRows?.length || 0})</option>
          <option value="SUPPLY">Nguồn Tổng Cấp</option>
          <option value="CONSUMPTION">Đo Tiêu Thụ</option>
          {trendData?.pointRows?.some((r: any) => r.isRecycledWater) && (
            <option value="RECYCLED">Nước Tái Sử Dụng</option>
          )}
          {trendData?.pointRows?.some((r: any) => r.isExcludedFromTotal) && (
            <option value="EXCLUDED">Đo Đối Chứng</option>
          )}
          {(trendData?.pointRows || []).map((r: any) => (
            <option key={r.pointId} value={r.pointId}>
              {r.code} - {r.name}
            </option>
          ))}
        </select>
        {trendFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => setTrendFilter('ALL')}
            className="btn-trend-reset"
            title="Đặt lại bộ lọc"
          >
            <X size={12} />
          </button>
        )}
      </div>


      {/* 5. Nút xuất CSV cho ma trận */}
      <ExportButton
        onExport={handleExportTrendCSV}
        className="btn-export-csv trend-export-btn"
        label="Xuất CSV"
      />
    </div>
  </div>

  {/* HIỂN THỊ DẠNG BIỂU ĐỒ HOẶC DẠNG BẢNG MA TRẬN (CHUYỂN ĐỔI THEO NÚT BẤM) */}
  {trendDisplayType === 'CHART' ? (
      <UtilityTrendChart
        trendData={trendData}
        trendFilter={trendFilter}
      unit={cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³'}
    />
  ) : (
    <>
      {/* Thanh Hỗ Trợ Điều Hướng Nhanh & Trạng Thái Cuộn Ngang */}
      <div className="trend-nav-strip">
        <div className="trend-nav-info">
          <Calendar size={13} color="#059669" />
          <span className="trend-nav-period-text">
            {trendViewMode === 'HOURLY' ? `Ngày ${String(trendDay).padStart(2, '0')}/${String(trendMonth).padStart(2, '0')}/${trendYear} (24 giờ)` :
             trendViewMode === 'DAILY' ? `Kỳ Tháng ${trendMonth}/${trendYear} (${trendData?.timeColumns?.length || 0} ngày)` :
             trendViewMode === 'MONTHLY' ? `Năm ${trendYear} (12 tháng)` :
             `Giai đoạn ${trendStartYear} - ${trendEndYear} (${trendData?.timeColumns?.length || 0} năm)`}
          </span>
          <span className="trend-scroll-guide">
            • Cuộn chuột ngang hoặc nhấn nút để nhảy nhanh:
          </span>
        </div>

        <div className="trend-nav-actions">
          {trendViewMode === 'HOURLY' && (
            <div className="trend-jump-group">
              <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ 00h đến 07h">
                00h-07h
              </button>
              <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ 08h đến 15h">
                08h-15h
              </button>
              <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem từ 16h đến 23h & Tổng">
                16h-23h
              </button>
            </div>
          )}
          {trendViewMode === 'DAILY' && (
            <div className="trend-jump-group">
              <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ ngày 01 đến 10">
                01-10
              </button>
              <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ ngày 11 đến 20">
                11-20
              </button>
              <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem các ngày cuối & Tổng">
                21-Cuối
              </button>
            </div>
          )}
          <div className="trend-arrows-group">
            <button type="button" onClick={() => scrollTrendTable(-300)} className="btn-arrow-pill" title="Cuộn sang trái">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={() => scrollTrendTable(300)} className="btn-arrow-pill" title="Cuộn sang phải">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Ma Trận Cuộn Ngang (Horizontal Scroll Container với Sticky Columns) */}
      <div 
        ref={trendTableContainerRef}
        className="trend-matrix-table-container"
      >
        <table className="custom-table trend-matrix-table">
          <thead>
            <tr>
              <th className="trend-th-sticky trend-col-stt">STT</th>
              <th className="trend-th-sticky trend-col-code">Mã Điểm Đo</th>
              <th className="trend-th-sticky trend-col-name">Tên Điểm Đo & Vị Trí</th>

              {/* Các cột mốc thời gian động */}
              {(trendData?.timeColumns || []).map((col: any) => (
                <th
                  key={col.key}
                  className={`trend-th-day ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}
                  title={col.label}
                >
                  <div>{col.shortLabel}</div>
                  {col.subLabel && (
                    <span className={`trend-day-sub ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}>
                      {col.subLabel}
                    </span>
                  )}
                </th>
              ))}

              <th className="trend-th-total">
                Tổng Cộng ({trendData?.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³')})
              </th>
              <th className="trend-th-avg">
                Trung Bình
              </th>
              <th className="trend-th-trend">
                Xu Hướng
              </th>
            </tr>
          </thead>
          <tbody>
            {trendLoading ? (
              <tr>
                <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Đang tổng hợp dữ liệu ma trận theo {trendViewMode === 'HOURLY' ? 'giờ' : trendViewMode === 'DAILY' ? 'ngày' : trendViewMode === 'MONTHLY' ? 'tháng' : 'năm'}...
                </td>
              </tr>
            ) : !trendData?.timeColumns || trendData.timeColumns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Không có dữ liệu trong khoảng thời gian đã chọn.
                </td>
              </tr>
            ) : (
              <>
                {/* 1. HÀNG TỔNG HỢP NGUỒN CẤP VÀO */}
                {trendData?.summaryRows?.totalSupply && (
                  <tr className="trend-row-summary supply">
                    <td className="trend-td-sticky trend-col-stt supply">Σ</td>
                    <td className="trend-td-sticky trend-col-code supply">NGUỒN CẤP</td>
                    <td className="trend-td-sticky trend-col-name supply">
                      1. TỔNG CẤP VÀO
                    </td>
                    {(trendData.timeColumns || []).map((col: any) => {
                      const val = trendData.summaryRows.totalSupply.values?.[col.key] || 0;
                      return (
                        <td key={col.key} className="trend-td-val supply">
                          {val > 0 ? formatVN(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="trend-td-total supply">
                      {formatVN(trendData.summaryRows.totalSupply.total)}
                    </td>
                    <td className="trend-td-avg supply">
                      {formatVN(trendData.summaryRows.totalSupply.average)}
                    </td>
                    <td className="trend-td-trend supply">-</td>
                  </tr>
                )}

                {/* 2. HÀNG TỔNG HỢP SỬ DỤNG NỘI BỘ */}
                {trendData?.summaryRows?.totalConsumption && (
                  <tr className="trend-row-summary consumption">
                    <td className="trend-td-sticky trend-col-stt consumption">Σ</td>
                    <td className="trend-td-sticky trend-col-code consumption">TIÊU THỤ</td>
                    <td className="trend-td-sticky trend-col-name consumption">
                      2. TỔNG SỬ DỤNG NỘI BỘ
                    </td>
                    {(trendData.timeColumns || []).map((col: any) => {
                      const val = trendData.summaryRows.totalConsumption.values?.[col.key] || 0;
                      return (
                        <td key={col.key} className="trend-td-val consumption">
                          {val > 0 ? formatVN(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="trend-td-total consumption">
                      {formatVN(trendData.summaryRows.totalConsumption.total)}
                    </td>
                    <td className="trend-td-avg consumption">
                      {formatVN(trendData.summaryRows.totalConsumption.average)}
                    </td>
                    <td className="trend-td-trend consumption">-</td>
                  </tr>
                )}

                {/* 3. HÀNG TÁI SỬ DỤNG NƯỚC (NẾU CÓ) */}
                {trendData?.summaryRows?.totalRecycled && (
                  <tr className="trend-row-summary recycled">
                    <td className="trend-td-sticky trend-col-stt recycled">Σ</td>
                    <td className="trend-td-sticky trend-col-code recycled">TÁI SỬ DỤNG</td>
                    <td className="trend-td-sticky trend-col-name recycled">
                      NƯỚC TÁI SỬ DỤNG (TIẾT KIỆM)
                    </td>
                    {(trendData.timeColumns || []).map((col: any) => {
                      const val = trendData.summaryRows.totalRecycled.values?.[col.key] || 0;
                      return (
                        <td key={col.key} className="trend-td-val recycled">
                          {val > 0 ? formatVN(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="trend-td-total recycled">
                      {formatVN(trendData.summaryRows.totalRecycled.total)}
                    </td>
                    <td className="trend-td-avg recycled">
                      {formatVN(trendData.summaryRows.totalRecycled.average)}
                    </td>
                    <td className="trend-td-trend recycled">-</td>
                  </tr>
                )}

                {/* 4. HÀNG CHÊNH LỆCH / HAO HỤT */}
                {trendData?.summaryRows?.delta && (
                  <tr className="trend-row-summary delta">
                    <td className="trend-td-sticky trend-col-stt delta">Δ</td>
                    <td className="trend-td-sticky trend-col-code delta">CHÊNH LỆCH</td>
                    <td className="trend-td-sticky trend-col-name delta">
                      3. HAO HỤT / THẤT THOÁT
                    </td>
                    {(trendData.timeColumns || []).map((col: any) => {
                      const val = trendData.summaryRows.delta.values?.[col.key] || 0;
                      return (
                        <td key={col.key} className="trend-td-val delta">
                          {val !== 0 ? formatVN(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="trend-td-total delta">
                      {formatVN(trendData.summaryRows.delta.total)}
                    </td>
                    <td className="trend-td-avg delta">
                      {formatVN(trendData.summaryRows.delta.average)}
                    </td>
                    <td className="trend-td-trend delta">-</td>
                  </tr>
                )}

                {/* 5. CÁC HÀNG CHI TIẾT TỪNG ĐIỂM ĐO */}
                {displayedTrendRows.length === 0 ? (
                  <tr>
                    <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Không có điểm đo nào khớp với bộ lọc đã chọn.
                    </td>
                  </tr>
                ) : (
                  displayedTrendRows.map((r: any, idx: number) => (
                    <tr key={r.pointId} className="trend-row-point">
                      <td className="trend-td-sticky trend-col-stt point">
                        {idx + 1}
                      </td>
                      <td className="trend-td-sticky trend-col-code point">
                        <strong className="trend-point-code">{r.code}</strong>
                      </td>
                      <td className="trend-td-sticky trend-col-name point">
                        <div className="trend-point-name">{r.name}</div>
                        <div className="trend-point-loc">{r.location}</div>
                      </td>

                      {(trendData.timeColumns || []).map((col: any) => {
                        const val = r.values?.[col.key] || 0;
                        const isNonZero = val > 0;
                        return (
                          <td
                            key={col.key}
                            className={`trend-td-cell ${isNonZero ? (r.isSupplyMeter ? 'has-val-supply' : 'has-val-cons') : 'empty'}`}
                          >
                            {isNonZero ? formatVN(val) : '-'}
                          </td>
                        );
                      })}

                      <td className={`trend-td-total point ${r.isSupplyMeter ? 'supply' : r.isRecycledWater ? 'recycled' : r.isExcludedFromTotal ? 'excluded' : 'cons'}`}>
                        {formatVN(r.total)}
                      </td>
                      <td className="trend-td-avg point">
                        {formatVN(r.average)}
                      </td>
                      <td className="trend-td-trend point">
                        {r.trendPercent > 0 ? (
                          <span className="trend-badge up" title="Tăng so với mốc trước">
                            <TrendingUp size={11} /> +{r.trendPercent}%
                          </span>
                        ) : r.trendPercent < 0 ? (
                          <span className="trend-badge down" title="Giảm so với mốc trước">
                            <TrendingDown size={11} /> {r.trendPercent}%
                          </span>
                        ) : (
                          <span className="trend-badge flat">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>
    </>
  );
};
