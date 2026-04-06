import { Table } from '@mantine/core'
import { SortColumn } from '../types'

export function SortableHeader({
  sortKey,
  label,
  onSort,
}: {
  sortKey: SortColumn
  label: string
  onSort: (col: SortColumn) => void
}) {
  return (
    <Table.Th style={{ cursor: 'pointer' }} onClick={() => onSort(sortKey)}>
      {label}
    </Table.Th>
  )
}
