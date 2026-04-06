import { SortColumn, SortDirection, TestRecord } from './types';

export function diffDisplay(diff: number): string {
  return `${Math.round(diff * 100000) / 1000}%`;
}

export function timingDisplay(timing: number): string {
  return `${Math.round(timing * 1000) / 1000}s`;
}

export function classForDiff(diff: number): string {
  if (diff === 0.0) return 'error-0';
  else if (diff < 0.001) return 'error-1';
  else if (diff < 0.01) return 'error-2';
  else if (diff < 0.05) return 'error-3';
  else if (diff < 0.1) return 'error-4';
  else if (diff < 0.25) return 'error-5';
  else if (diff < 0.5) return 'error-6';
  else if (diff < 0.75) return 'error-7';
  else if (diff < 1.0) return 'error-8';
  else return 'error-9';
}

export function diffStyle(diff: number): { backgroundColor: string; color: string } {
  if (diff === 0.0) return { backgroundColor: '#eeeeee', color: '#111111' };
  else if (diff < 0.001) return { backgroundColor: '#4ce600', color: '#111111' };
  else if (diff < 0.01) return { backgroundColor: '#55cc00', color: '#111111' };
  else if (diff < 0.05) return { backgroundColor: '#66cc00', color: '#111111' };
  else if (diff < 0.1) return { backgroundColor: '#ede621', color: '#111111' };
  else if (diff < 0.25) return { backgroundColor: '#edc421', color: '#111111' };
  else if (diff < 0.5) return { backgroundColor: '#cc5000', color: '#ffffff' };
  else if (diff < 0.75) return { backgroundColor: '#cc4400', color: '#ffffff' };
  else if (diff < 1.0) return { backgroundColor: '#cc2200', color: '#ffffff' };
  else return { backgroundColor: '#cc0000', color: '#ffffff' };
}

export function sortRecords(
  records: TestRecord[],
  column: SortColumn,
  direction: SortDirection = 'asc'
): TestRecord[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    if (column === 'group' || column === 'name' || column === 'hardware') {
      return (a[column] > b[column] ? 1 : -1) * sign;
    }
    const aData = a.data[a.data.length - 1];
    const bData = b.data[b.data.length - 1];
    if (!aData || !bData) return 0;
    if (column === 'timeStamp') {
      return (new Date(aData.timeStamp) > new Date(bData.timeStamp) ? 1 : -1) * sign;
    }
    return (aData[column] > bData[column] ? 1 : -1) * sign;
  });
}
