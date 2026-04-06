import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Anchor, Box, Button, Checkbox, Group, PasswordInput,
  Select, Table, Text, Title,
} from '@mantine/core'
import { TestRecord, TestData } from '../types'
import { diffDisplay, diffStyle, timingDisplay } from '../utils'

type SortColumn =
  | 'pixelError'
  | 'timing'
  | 'commitHash'
  | 'timeStamp'
  | 'group'
  | 'name'
  | 'hardware'

function sortRecords(records: TestRecord[], column: SortColumn): TestRecord[] {
  return [...records].sort((a, b) => {
    if (column === 'group' || column === 'name' || column === 'hardware') {
      return a[column] > b[column] ? 1 : -1
    }
    const aData = a.data[a.data.length - 1]
    const bData = b.data[b.data.length - 1]
    if (!aData || !bData) return 0
    if (column === 'timeStamp') {
      return new Date(aData.timeStamp) > new Date(bData.timeStamp) ? 1 : -1
    }
    if (column === 'pixelError') {
      // Descending: highest error first
      return aData.pixelError < bData.pixelError ? 1 : -1
    }
    return aData[column] > bData[column] ? 1 : -1
  })
}

function ImageThumbnail({
  type, group, name, hardware, timestamp, stopPropagation = false,
}: {
  type: string
  group: string
  name: string
  hardware: string
  timestamp?: string
  stopPropagation?: boolean
}) {
  const timePart = timestamp ? `/${timestamp}` : ''
  return (
    <Anchor
      href={`/api/result/${type}/${group}/${name}/${hardware}${timePart}`}
      target="_blank"
      onClick={stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
    >
      <img
        src={`/api/result/${type}-thumbnail/${group}/${name}/${hardware}${timePart}`}
        style={{ width: 85, height: 47.8125 }}
        loading="lazy"
        alt={type}
      />
    </Anchor>
  )
}

function TestHistory({
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

const COL_SPAN = 10

function TestRow({
  record,
  onUpdateReference,
}: {
  record: TestRecord
  onUpdateReference: (record: TestRecord) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const latestData = record.data[record.data.length - 1]
  if (!latestData) return null

  return (
    <>
      <Table.Tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <Table.Td>
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
      {expanded && (
        <Table.Tr>
          <Table.Td colSpan={COL_SPAN} style={{ padding: 0 }}>
            <TestHistory record={record} onUpdateReference={onUpdateReference} />
          </Table.Td>
        </Table.Tr>
      )}
    </>
  )
}

function SortableHeader({
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

export default function Home() {
  const [records, setRecords] = useState<TestRecord[]>([])
  const [allHardware, setAllHardware] = useState<string[]>([])
  const [selectedHardware, setSelectedHardware] = useState<Set<string>>(new Set())
  const [adminToken, setAdminToken] = useState('')

  useEffect(() => {
    fetch('/api/test-records')
      .then(res => res.json())
      .then((data: TestRecord[]) => {
        const hardwares = [...new Set(data.map(r => r.hardware))].sort()
        setAllHardware(hardwares)
        setSelectedHardware(new Set(hardwares))
        setRecords(sortRecords(data, 'pixelError'))
      })
  }, [])

  function handleSort(column: SortColumn) {
    setRecords(prev => sortRecords(prev, column))
  }

  function toggleHardware(hw: string) {
    setSelectedHardware(prev => {
      const next = new Set(prev)
      if (next.has(hw)) {
        next.delete(hw)
      } else {
        next.add(hw)
      }
      return next
    })
  }

  async function updateReference(record: TestRecord) {
    const response = await fetch('/api/update-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminToken,
        group: record.group,
        name: record.name,
        hardware: record.hardware,
      }),
    })
    if (response.status === 200) {
      alert('Successfully updated reference image')
    } else {
      alert(
        `Error updating reference\n${response.status}\nError: ${response.statusText}`,
      )
    }
  }

  const visibleRecords = records.filter(r => selectedHardware.has(r.hardware))

  return (
    <Box>
      {/* Header */}
      <Box py="md" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-dark-7)' }}>
        <Title order={1} style={{ fontVariant: 'small-caps' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
            OpenSpace Image Testing
          </Link>
        </Title>
      </Box>

      {/* Controls */}
      <Group
        p="sm"
        align="flex-start"
        justify="space-between"
        style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}
      >
        <Group gap="sm" align="center" wrap="wrap">
          <Text fw={600}>Hardware:</Text>
          <Select
            size="xs"
            w={200}
            data={[
              { value: 'all', label: 'All' },
              ...allHardware.map(hw => ({ value: hw, label: hw })),
            ]}
            defaultValue="all"
            onChange={val => {
              if (val === 'all') setSelectedHardware(new Set(allHardware))
              else if (val) setSelectedHardware(new Set([val]))
            }}
          />
          {allHardware.map(hw => (
            <Checkbox
              key={hw}
              label={hw}
              checked={selectedHardware.has(hw)}
              onChange={() => toggleHardware(hw)}
            />
          ))}
          <Anchor component={Link as any} to="/compare" size="sm">
            Hardware Compare
          </Anchor>
        </Group>
        <Group gap="xs">
          <Text fw={600}>Admin:</Text>
          <PasswordInput
            size="xs"
            w={180}
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
          />
        </Group>
      </Group>

      {/* Test records table */}
      <Table striped highlightOnHover withColumnBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <SortableHeader sortKey="pixelError" label="Error" onSort={handleSort} />
            <SortableHeader sortKey="group" label="Group" onSort={handleSort} />
            <SortableHeader sortKey="name" label="Name" onSort={handleSort} />
            <SortableHeader sortKey="hardware" label="Hardware" onSort={handleSort} />
            <SortableHeader sortKey="timing" label="Timing" onSort={handleSort} />
            <SortableHeader sortKey="commitHash" label="Commit" onSort={handleSort} />
            <SortableHeader sortKey="timeStamp" label="Timestamp" onSort={handleSort} />
            <Table.Th>Candidate</Table.Th>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Difference</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleRecords.map(record => (
            <TestRow
              key={`${record.group}-${record.name}-${record.hardware}`}
              record={record}
              onUpdateReference={updateReference}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  )
}
