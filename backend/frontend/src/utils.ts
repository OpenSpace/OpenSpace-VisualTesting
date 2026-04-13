import { SortColumn, SortDirection, TestRecord } from './types';

export function timingDisplay(timing: number): string {
  return `${Math.round(timing * 1000) / 1000}s`;
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
