import { Stack, Table, UnstyledButton } from '@mantine/core';

import { SortColumn, SortDirection } from '../types';

interface Props {
  sortKey: SortColumn;
  label: string;
  onSort: (col: SortColumn) => void;
  filter?: React.ReactNode;
  activeColumn?: SortColumn;
  direction?: SortDirection;
}

export function SortableHeader({
  sortKey,
  label,
  onSort,
  filter,
  activeColumn,
  direction
}: Props) {
  const isActive = activeColumn === sortKey;
  const indicator = isActive ? (direction === 'asc' ? ' ↑' : ' ↓') : '';
  return (
    <Table.Th>
      <Stack gap={0}>
        <UnstyledButton
          style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
          onClick={() => onSort(sortKey)}
        >
          {label}
          {indicator}
        </UnstyledButton>
        {filter}
      </Stack>
    </Table.Th>
  );
}
