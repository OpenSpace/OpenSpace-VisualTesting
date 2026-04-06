import { Anchor, Box, Button, Table, Text } from '@mantine/core'
import { TestRecord, TestData } from '../types'
import { diffDisplay, diffStyle, timingDisplay } from '../utils'
import { ImageThumbnail } from './ImageThumbnail'

export function TestHistory({
  record,
  onUpdateReference,
}: {
  record: TestRecord
  onUpdateReference: (record: TestRecord) => void
}) {
  const testData = [...record.data].reverse()

  function imageRow(type: string) {
    return (
      <Table.Tr key={type}>
        <Table.Td style={{ transform: 'rotate(270deg)', whiteSpace: 'nowrap', width: 20 }}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Table.Td>
        {testData.map((d: TestData) => (
          <Table.Td key={d.timeStamp}>
            <ImageThumbnail
              type={type}
              group={record.group}
              name={record.name}
              hardware={record.hardware}
              timestamp={d.timeStamp}
            />
          </Table.Td>
        ))}
      </Table.Tr>
    )
  }

  return (
    <Box p="md" bg="dark.8">
      <Table horizontalSpacing="xs" verticalSpacing={4}>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td
                key={d.timeStamp}
                style={{ ...diffStyle(d.pixelError), width: 20, height: 15, padding: 0 }}
              />
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td key={d.timeStamp}>
                <Text size="xs" c="dimmed">{new Date(d.timeStamp).toUTCString()}</Text>
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td key={d.timeStamp}>
                <Box px={4} style={{ borderRadius: 4, display: 'inline-block', ...diffStyle(d.pixelError) }}>
                  <Text size="sm">{diffDisplay(d.pixelError)}</Text>
                </Box>
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td key={d.timeStamp}>
                <Anchor
                  size="xs"
                  href={`https://github.com/OpenSpace/OpenSpace/commit/${d.commitHash}`}
                  target="_blank"
                >
                  {d.commitHash.substring(0, 8)}
                </Anchor>
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td key={d.timeStamp}>
                <Text size="sm">{timingDisplay(d.timing)}</Text>
              </Table.Td>
            ))}
          </Table.Tr>
          <Table.Tr>
            <Table.Td />
            {testData.map((d: TestData) => (
              <Table.Td key={d.timeStamp}>
                <Anchor
                  size="xs"
                  href={`/api/result/log/${record.group}/${record.name}/${record.hardware}/${d.timeStamp}`}
                  target="_blank"
                >
                  Log ({d.nErrors} errors)
                </Anchor>
              </Table.Td>
            ))}
          </Table.Tr>
          {imageRow('candidate')}
          {imageRow('reference')}
          {imageRow('difference')}
          <Table.Tr>
            <Table.Td />
            <Table.Td>
              <Button size="xs" variant="default" onClick={() => onUpdateReference(record)}>
                Upgrade Candidate to Reference
              </Button>
            </Table.Td>
            {testData.slice(1).map((d: TestData) => (
              <Table.Td key={d.timeStamp} />
            ))}
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Box>
  )
}
