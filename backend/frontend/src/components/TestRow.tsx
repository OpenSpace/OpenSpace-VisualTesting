import { Anchor, Box, Table, Text } from '@mantine/core'
import { TestRecord } from '../types'
import { diffDisplay, diffStyle, timingDisplay } from '../utils'
import { ImageThumbnail } from './ImageThumbnail'

interface Props {
  record: TestRecord
  onOpen: (record: TestRecord) => void
};

export function TestRow({ record, onOpen }: Props) {
  const latestData = record.data[record.data.length - 1]
  if (!latestData) return null

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => onOpen(record)}>
      <Table.Td style={{ width: 90 }}>
        <Box
          px={6}
          py={2}
          style={{ borderRadius: 4, textAlign: 'center', fontSize: 13, ...diffStyle(latestData.pixelError) }}
        >
          {diffDisplay(latestData.pixelError)}
        </Box>
      </Table.Td>
      <Table.Td>{record.group}</Table.Td>
      <Table.Td>{record.name}</Table.Td>
      <Table.Td>{record.hardware}</Table.Td>
      <Table.Td>{timingDisplay(latestData.timing)}</Table.Td>
      <Table.Td>
        <Anchor
          size="sm"
          href={`https://github.com/OpenSpace/OpenSpace/commit/${latestData.commitHash}`}
          target="_blank"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {latestData.commitHash.substring(0, 8)}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{new Date(latestData.timeStamp).toISOString()}</Text>
      </Table.Td>
      <Table.Td>
        <ImageThumbnail
          type="candidate" group={record.group} name={record.name}
          hardware={record.hardware} stopPropagation
        />
      </Table.Td>
      <Table.Td>
        <ImageThumbnail
          type="reference" group={record.group} name={record.name}
          hardware={record.hardware} stopPropagation
        />
      </Table.Td>
      <Table.Td>
        <ImageThumbnail
          type="difference" group={record.group} name={record.name}
          hardware={record.hardware} stopPropagation
        />
      </Table.Td>
    </Table.Tr>
  )
}
