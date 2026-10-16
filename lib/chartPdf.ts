import { monthLabel } from './dates';

export type ReportStats = {
  activeDays: number;
  totalDays: number;
  percentage: number;
  completedItems: number;
};

export type ReportDayData = {
  date: string;
  pct: number;
};

export type ReportItem = {
  key: string;
  label: string;
  labelEn: string;
  type: 'checkbox' | 'number' | 'percent';
  unit?: string;
};

export type ReportEntry = {
  task_key: string;
  entry_date: string;
  is_done: boolean;
  value: number | null;
};

export function getSpiritualBadge(percentage: number): { label: string; labelMl: string; color: string } {
  if (percentage >= 90) return { label: 'Master Bestower', labelMl: 'സമ്പൂർണ്ണൻ (100% സമർപ്പണം)', color: '#B45309' };
  if (percentage >= 75) return { label: 'Deep Purity & Power', labelMl: 'ശക്തിശാലി (ഉന്നത പുരുഷാർത്ഥി)', color: '#047857' };
  if (percentage >= 50) return { label: 'Peaceful Progress', labelMl: 'പുരോഗതി (സന്തോഷവാനായ സാധകൻ)', color: '#0284C7' };
  if (percentage > 0) return { label: 'Soul Awakening', labelMl: 'ആരംഭം (ആത്മീയ ജാഗ്രത)', color: '#D97706' };
  return { label: 'Start Daily Chart', labelMl: 'തുടങ്ങുക (പുതിയ ചുവടുവെപ്പ്)', color: '#64748B' };
}

export function generateMonthlyReportHtml({
  year,
  month,
  stats,
  dayData,
  items,
  entries,
}: {
  year: number;
  month: number;
  stats: ReportStats;
  dayData: ReportDayData[];
  items: ReportItem[];
  entries: ReportEntry[];
}): string {
  const currentMonthLabel = monthLabel(year, month);
  const badge = getSpiritualBadge(stats.percentage);
  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.entry_date.startsWith(prefix));

  // Compute item-level completion metrics
  const itemStats = items.map((item, idx) => {
    const completions = monthEntries.filter(
      (e) => e.task_key === item.key && (e.is_done || (e.value !== null && e.value > 0)),
    ).length;
    const rate = stats.totalDays > 0 ? Math.round((completions / stats.totalDays) * 100) : 0;
    return {
      index: idx + 1,
      ...item,
      completions,
      rate,
    };
  });

  // Build daily progress bar rows
  const dailyRows = dayData
    .map((d) => {
      const dayNum = Number(d.date.slice(-2));
      const pctValue = Math.round(d.pct * 100);
      const isComplete = pctValue >= 80;
      const isModerate = pctValue >= 40 && pctValue < 80;
      const barColor = isComplete ? '#059669' : isModerate ? '#D97706' : pctValue > 0 ? '#3B82F6' : '#E2E8F0';
      return `
        <div class="day-cell">
          <div class="day-num">Day ${dayNum}</div>
          <div class="day-bar-track">
            <div class="day-bar-fill" style="width: ${Math.max(4, pctValue)}%; background-color: ${barColor};"></div>
          </div>
          <div class="day-pct">${pctValue}%</div>
        </div>
      `;
    })
    .join('');

  // Build item table rows
  const itemRows = itemStats
    .map((item) => {
      const rateColor = item.rate >= 75 ? '#047857' : item.rate >= 50 ? '#0284C7' : item.rate > 0 ? '#B45309' : '#64748B';
      return `
        <tr>
          <td class="text-center bold">${String(item.index).padStart(2, '0')}</td>
          <td>
            <div class="item-title">${escapeHtml(item.label)}</div>
            ${item.label !== item.labelEn ? `<div class="item-sub">${escapeHtml(item.labelEn)}</div>` : ''}
          </td>
          <td class="text-center">${item.type === 'percent' ? 'ശതമാനം (%)' : item.type === 'number' ? `എണ്ണം (${item.unit || 'x'})` : 'ടിക്ക് (Check)'}</td>
          <td class="text-center bold">${item.completions} / ${stats.totalDays}</td>
          <td class="text-center">
            <span class="rate-badge" style="color: ${rateColor}; border-color: ${rateColor}33; background-color: ${rateColor}12;">
              ${item.rate}%
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect GOD - ${escapeHtml(currentMonthLabel)} Daily Chart Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', 'Noto Sans Malayalam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      line-height: 1.5;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .report-container {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 32px 36px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
    }
    /* Header Branding */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #F1F5F9;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #991B1B;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 13px;
      font-weight: 600;
      color: #B45309;
      margin-top: 2px;
    }
    .brand-org {
      font-size: 11.5px;
      color: #64748B;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
    }
    .report-month {
      font-size: 20px;
      font-weight: 700;
      color: #1E293B;
    }
    .report-date {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
    }
    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 12px;
      text-align: center;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
      color: #991B1B;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-card {
      grid-column: span 4;
      background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
      border: 1px solid #FDE68A;
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .badge-label {
      font-size: 13.5px;
      font-weight: 700;
      color: #92400E;
    }
    .badge-sub {
      font-size: 12px;
      color: #B45309;
    }
    /* Section Headers */
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    /* Daily Breakdown Grid */
    .days-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 28px;
    }
    .day-cell {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .day-num {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      width: 44px;
    }
    .day-bar-track {
      flex: 1;
      height: 6px;
      background: #F1F5F9;
      border-radius: 3px;
      overflow: hidden;
    }
    .day-bar-fill {
      height: 100%;
      border-radius: 3px;
    }
    .day-pct {
      font-size: 10.5px;
      font-weight: 700;
      color: #0F172A;
      width: 32px;
      text-align: right;
    }
    /* Table Styling */
    .table-wrap {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 28px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    thead {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }
    th {
      padding: 10px 12px;
      font-weight: 700;
      color: #475569;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .item-title {
      font-weight: 600;
      color: #0F172A;
    }
    .item-sub {
      font-size: 11px;
      color: #64748B;
      margin-top: 1px;
    }
    .text-center {
      text-align: center;
    }
    .bold {
      font-weight: 700;
    }
    .rate-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid;
    }
    /* Footer */
    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 18px;
      text-align: center;
      color: #64748B;
      font-size: 11.5px;
    }
    .footer-quote {
      font-weight: 600;
      color: #991B1B;
      margin-bottom: 4px;
    }
    .no-print-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 18px;
      background: #991B1B;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      body {
        background: #FFFFFF !important;
        padding: 0 !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
      .days-grid {
        grid-template-columns: repeat(4, 1fr) !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print no-print-bar">
    <button class="btn" onclick="window.print()">Save as PDF / Print</button>
  </div>
  <div class="report-container">
    <div class="header">
      <div>
        <div class="brand-title">Connect GOD</div>
        <div class="brand-sub">Daily Chart & Monthly Purusharth Report</div>
        <div class="brand-org">Prajapita Brahma Kumaris Ishwariya Vishwa Vidyalaya, Kozhikode</div>
      </div>
      <div class="report-meta">
        <div class="report-month">${escapeHtml(currentMonthLabel)}</div>
        <div class="report-date">Generated: ${escapeHtml(generatedAt)}</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${stats.percentage}%</div>
        <div class="kpi-label">Performance</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.activeDays} / ${stats.totalDays}</div>
        <div class="kpi-label">Days Active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${stats.completedItems}</div>
        <div class="kpi-label">Total Checkmarks</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${items.length}</div>
        <div class="kpi-label">Daily Items</div>
      </div>
    </div>

    <div class="badge-card">
      <div>
        <div class="badge-label">🌟 Spiritual Stage: ${escapeHtml(badge.label)}</div>
        <div class="badge-sub">${escapeHtml(badge.labelMl)}</div>
      </div>
      <div style="font-weight: 800; font-size: 18px; color: ${badge.color};">
        ${stats.percentage}%
      </div>
    </div>

    <div class="section-title">
      <span>📅</span> Daily Completion Breakdown (Days 1–${stats.totalDays})
    </div>
    <div class="days-grid">
      ${dailyRows}
    </div>

    <div class="section-title">
      <span>📋</span> Item-by-Item Purusharth Summary
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width: 40px;" class="text-center">#</th>
            <th>വിഷയം (Purusharth Item)</th>
            <th class="text-center">ടൈപ്പ് (Type)</th>
            <th class="text-center">ചെയ്ത ദിവസങ്ങൾ (Days)</th>
            <th class="text-center" style="width: 70px;">റേറ്റ് (Rate)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="footer-quote">"സ്വയം പരിവർത്തനത്തിലൂടെ വിശ്വ പരിവർത്തനം"</div>
      <div>Connect GOD App • BK Kozhikode Official • https://www.bkkozhikode.com</div>
      <div style="margin-top: 4px; font-size: 10.5px; color: #94A3B8;">Om Shanti • Self-Transformation Progress Record</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Triggers PDF export or print dialog.
 * - On Native Android (Capacitor): calls AndroidHost.printHtml via bridge.
 * - On Web/PWA: prints via hidden iframe or popup window.
 */
export function exportMonthlyReport(htmlContent: string): void {
  // Check if running inside Android Capacitor with our native printHtml bridge
  if (typeof window !== 'undefined' && (window as any).AndroidHost?.printHtml) {
    try {
      (window as any).AndroidHost.printHtml(htmlContent);
      return;
    } catch (e) {
      console.warn('Native AndroidHost.printHtml failed, falling back to web print:', e);
    }
  }

  if (typeof window === 'undefined') return;

  // Web / PWA approach:
  try {
    let iframe = document.getElementById('connectgod-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'connectgod-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (err) {
          console.warn('iframe print failed, opening popup:', err);
          fallbackPopupPrint(htmlContent);
        }
      }, 500);
    } else {
      fallbackPopupPrint(htmlContent);
    }
  } catch (err) {
    console.error('Print iframe error:', err);
    fallbackPopupPrint(htmlContent);
  }
}

function fallbackPopupPrint(htmlContent: string): void {
  try {
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
  } catch (e) {
    console.error('Popup print failed:', e);
  }
}

/**
 * Shares a text summary of the monthly chart via Web Share API or Clipboard.
 */
export async function shareMonthlyReport({
  monthLabelText,
  stats,
}: {
  monthLabelText: string;
  stats: ReportStats;
}): Promise<'shared' | 'copied' | 'failed'> {
  const badge = getSpiritualBadge(stats.percentage);
  const shareText = `🌟 *Connect GOD - Monthly Daily Chart Report* (${monthLabelText})
📊 *Performance*: ${stats.percentage}%
📅 *Days Completed*: ${stats.activeDays} / ${stats.totalDays} Days
✅ *Total Checkmarks*: ${stats.completedItems}
🧘 *Spiritual Stage*: ${badge.label} (${badge.labelMl})

"സ്വയം പരിവർത്തനത്തിലൂടെ വിശ്വ പരിവർത്തനം"
Connect GOD App - BK Kozhikode Official: https://app.bkkozhikode.com
Om Shanti! 🙏`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Connect GOD - ${monthLabelText} Daily Chart Report`,
        text: shareText,
        url: 'https://app.bkkozhikode.com',
      });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'failed';
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareText);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
