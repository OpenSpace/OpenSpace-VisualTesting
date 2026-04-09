import { Table } from '@mantine/core';

import { SortColumn, SortDirection } from '../types';

interface Props {
  sortKey: SortColumn;
  label: string;
  onSort: (col: SortColumn) => void;
  activeColumn?: SortColumn;
  direction?: SortDirection;
}

export function SortableHeader({
  sortKey,
  label,
  onSort,
  activeColumn,
  direction
}: Props) {
  const isActive = activeColumn === sortKey;
  const indicator = isActive ? (direction === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <Table.Th
      style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {indicator}
    </Table.Th>
  );
}
