import { Anchor, Box, Button, Table, Text } from '@mantine/core'
import { TestRecord, TestData } from '../types'
import { diffDisplay, diffStyle, timingDisplay } from '../utils'
import { ImageThumbnail } from './ImageThumbnail'

interface Props {
  record: TestRecord
  onUpdateReference: (record: TestRecord) => void
};

export function TestHistory({ record, onUpdateReference }: Props) {
  const testData = [...record.data].reverse()

  return (
    <Box p="md" bg="dark.8">
      <Table horizontalSpacing="xs" verticalSpacing={4} withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Timestamp</Table.Th>
            <Table.Th>Error</Table.Th>
            <Table.Th>Commit</Table.Th>
            <Table.Th>Timing</Table.Th>
            <Table.Th>Log</Table.Th>
            <Table.Th>Candidate</Table.Th>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Difference</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {testData.map((d: TestData, i: number) => (
            <Table.Tr key={d.timeStamp}>
              <Table.Td>
                <Text size="sm" c="dimmed">{new Date(d.timeStamp).toUTCString()}</Text>
              </Table.Td>
              <Table.Td>
                <Box px={4} style={{ borderRadius: 4, display: 'inline-block', width: 70, textAlign: 'center', ...diffStyle(d.pixelError) }}>
                  <Text>{diffDisplay(d.pixelError)}</Text>
                </Box>
              </Table.Td>
              <Table.Td>
                <Anchor
                  href={`https://github.com/OpenSpace/OpenSpace/commit/${d.commitHash}`}
                  target="_blank"
                >
                  {d.commitHash.substring(0, 8)}
                </Anchor>
              </Table.Td>
              <Table.Td>
                <Text>{timingDisplay(d.timing)}</Text>
              </Table.Td>
              <Table.Td>
                <Anchor
                  href={`/api/result/log/${record.group}/${record.name}/${record.hardware}/${d.timeStamp}`}
                  target="_blank"
                >
                  Log ({d.nErrors} errors)
                </Anchor>
              </Table.Td>
              <Table.Td>
                <ImageThumbnail type="candidate" group={record.group} name={record.name}
                  hardware={record.hardware} timestamp={d.timeStamp} />
              </Table.Td>
              <Table.Td>
                <ImageThumbnail type="reference" group={record.group} name={record.name}
                  hardware={record.hardware} timestamp={d.timeStamp} />
              </Table.Td>
              <Table.Td>
                <ImageThumbnail type="difference" group={record.group} name={record.name}
                  hardware={record.hardware} timestamp={d.timeStamp} />
              </Table.Td>
              <Table.Td>
                {i === 0 && (
                  <Button variant="default" onClick={() => onUpdateReference(record)}>
                    Upgrade Candidate to Reference
                  </Button>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  )
}
