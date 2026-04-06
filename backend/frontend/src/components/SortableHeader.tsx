import { Table } from '@mantine/core';
import { SortColumn } from '../types';

interface Props {
  sortKey: SortColumn;
  label: string;
  onSort: (col: SortColumn) => void;
}

export function SortableHeader({ sortKey, label, onSort }: Props) {
  return (
    <Table.Th style={{ cursor: 'pointer' }} onClick={() => onSort(sortKey)}>
      {label}
    </Table.Th>
  );
}
