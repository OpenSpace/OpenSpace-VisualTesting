import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor,
  Box,
  Checkbox,
  Group,
  Modal,
  PasswordInput,
  ScrollArea,
  Select,
  Table,
  Text,
  Title
} from '@mantine/core';
import { TestRecord, SortColumn } from '../types';
import { sortRecords } from '../utils';
import { TestHistory } from '../components/TestHistory';
import { TestRow } from '../components/TestRow';
import { SortableHeader } from '../components/SortableHeader';

export default function Home() {
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [allHardware, setAllHardware] = useState<string[]>([]);
  const [selectedHardware, setSelectedHardware] = useState<Set<string>>(new Set());
  const [adminToken, setAdminToken] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);

  useEffect(() => {
    fetch('/api/test-records')
      .then((res) => res.json())
      .then((data: TestRecord[]) => {
        const hardwares = [...new Set(data.map((r) => r.hardware))].sort();
        setAllHardware(hardwares);
        setSelectedHardware(new Set(hardwares));
        setRecords(sortRecords(data, 'pixelError'));
      });
  }, []);

  function handleSort(column: SortColumn) {
    setRecords((prev) => sortRecords(prev, column));
  }

  function toggleHardware(hw: string) {
    setSelectedHardware((prev) => {
      const next = new Set(prev);
      if (next.has(hw)) {
        next.delete(hw);
      } else {
        next.add(hw);
      }
      return next;
    });
  }

  async function updateReference(record: TestRecord) {
    const response = await fetch('/api/update-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminToken,
        group: record.group,
        name: record.name,
        hardware: record.hardware
      })
    });
    if (response.status === 200) {
      alert('Successfully updated reference image');
    } else {
      alert(
        `Error updating reference\n${response.status}\nError: ${response.statusText}`
      );
    }
  }

  const visibleRecords = records.filter((r) => selectedHardware.has(r.hardware));

  return (
    <Box>
      {/* Header */}
      <Box
        py="md"
        style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-dark-7)' }}
      >
        <Title
          order={1}
          style={{ fontVariant: 'small-caps', fontFamily: 'Roboto, sans-serif' }}
        >
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
              ...allHardware.map((hw) => ({ value: hw, label: hw }))
            ]}
            defaultValue="all"
            onChange={(val) => {
              if (val === 'all') setSelectedHardware(new Set(allHardware));
              else if (val) setSelectedHardware(new Set([val]));
            }}
          />
          {allHardware.map((hw) => (
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
            onChange={(e) => setAdminToken(e.target.value)}
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
          {visibleRecords.map((record) => (
            <TestRow
              key={`${record.group}-${record.name}-${record.hardware}`}
              onOpen={setSelectedRecord}
              record={record}
            />
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        title={
          selectedRecord
            ? `${selectedRecord.group} / ${selectedRecord.name} — ${selectedRecord.hardware}`
            : ''
        }
        size="auto"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selectedRecord && (
          <TestHistory record={selectedRecord} onUpdateReference={updateReference} />
        )}
      </Modal>
    </Box>
  );
}
