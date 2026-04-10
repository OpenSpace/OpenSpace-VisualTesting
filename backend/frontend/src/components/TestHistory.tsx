import { Anchor, Box, Button, Group, Modal, Stack, Table, Text } from '@mantine/core';

import { TestData, TestRecord } from '../types';
import { timingDisplay } from '../utils';

import { ImageThumbnail } from './ImageThumbnail';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { PixelDiffNumber } from './PixelDiffNumber';

interface Props {
  record: TestRecord;
  onUpdateReference: (record: TestRecord) => void;
}

export function TestHistory({ record, onUpdateReference }: Props) {
  const [wasUpdated, setWasUpdated] = useState(false);
  const [confirmOpened, { open, close }] = useDisclosure(false);

  const testData = [...record.data].reverse();

  const ImageWidth = 250;

  return (
    <>
      <Modal
        opened={confirmOpened}
        onClose={close}
        title="Are you sure?"
        size="lg"
        withCloseButton
        centered
      >
        <Stack align="center">
          <Text px={'md'}>
            Are you sure you want to update the reference image to the candidate for the
            test: {record.name}?{' '}
            <Text span fw={'bold'}>
              This action cannot be undone.
            </Text>
          </Text>

          <Group align={'center'} my={'sm'} wrap="nowrap">
            <Stack align={'center'} gap={'xs'}>
              <Text>Candidate</Text>
              <ImageThumbnail
                type={'candidate'}
                group={record.group}
                name={record.name}
                hardware={record.hardware}
                timestamp={testData[0].timeStamp}
                width={ImageWidth}
              />
            </Stack>
            <Text>→</Text>
            <Stack align={'center'} gap={'xs'}>
              <Text>Reference</Text>
              <ImageThumbnail
                type={'reference'}
                group={record.group}
                name={record.name}
                hardware={record.hardware}
                timestamp={testData[0].timeStamp}
                width={ImageWidth}
              />
            </Stack>
          </Group>
          <Text>
            Error: <PixelDiffNumber value={testData[0].pixelError} />
          </Text>

          <Text c={'dimmed'} size={'sm'} px={'md'}>
            After updating, you may have to wait a few seconds and refresh the page to see
            the updated reference.
          </Text>
          <Group>
            <Button
              onClick={() => {
                onUpdateReference(record);
                setWasUpdated(true);
              }}
              color="red"
            >
              Yes, update reference
            </Button>
            <Button
              onClick={() => {
                onUpdateReference(record);
                setWasUpdated(true);
              }}
              variant="default"
              autoFocus
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Box p={'md'} bg={'dark.8'}>
        <Table
          horizontalSpacing={'xs'}
          verticalSpacing={4}
          withTableBorder
          withColumnBorders
        >
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
                  <Text size={'sm'} c={'dimmed'}>
                    {new Date(d.timeStamp).toISOString().split('T')[0]}
                    <br />
                    {new Date(d.timeStamp).toISOString().split('T')[1]?.replace('Z', '')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <PixelDiffNumber value={d.pixelError} />
                </Table.Td>
                <Table.Td>
                  <Anchor
                    href={`https://github.com/OpenSpace/OpenSpace/commit/${d.commitHash}`}
                    target={'_blank'}
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
                    target={'_blank'}
                  >
                    Log ({d.nErrors} errors)
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <ImageThumbnail
                    type={'candidate'}
                    group={record.group}
                    name={record.name}
                    hardware={record.hardware}
                    timestamp={d.timeStamp}
                    width={ImageWidth}
                  />
                </Table.Td>
                <Table.Td>
                  <ImageThumbnail
                    type={'reference'}
                    group={record.group}
                    name={record.name}
                    hardware={record.hardware}
                    timestamp={d.timeStamp}
                    width={ImageWidth}
                  />
                </Table.Td>
                <Table.Td>
                  <ImageThumbnail
                    type={'difference'}
                    group={record.group}
                    name={record.name}
                    hardware={record.hardware}
                    timestamp={d.timeStamp}
                    width={ImageWidth}
                  />
                </Table.Td>
                <Table.Td>
                  {i === 0 && (
                    <>
                      <Button variant={'default'} onClick={open} disabled={wasUpdated}>
                        Upgrade Candidate to Reference
                      </Button>
                    </>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </>
  );
}
