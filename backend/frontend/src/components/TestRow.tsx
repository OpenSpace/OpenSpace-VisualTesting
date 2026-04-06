import { Anchor, Box, Table, Text } from '@mantine/core';

import { TestRecord } from '../types';
import { diffDisplay, diffStyle, timingDisplay } from '../utils';

import { ImageThumbnail } from './ImageThumbnail';

interface Props {
  record: TestRecord;
  onOpen: (record: TestRecord) => void;
}

export function TestRow({ record, onOpen }: Props) {
  const latestData = record.data[record.data.length - 1];
  if (!latestData) return null;

  const ImageWidth = 250;

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => onOpen(record)}>
      <Table.Td style={{ width: 90 }}>
        <Box
          px={6}
          py={2}
          style={{
            borderRadius: 4,
            textAlign: 'center',
            fontSize: 18,
            ...diffStyle(latestData.pixelError)
          }}
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
          href={`https://github.com/OpenSpace/OpenSpace/commit/${latestData.commitHash}`}
          target={'_blank'}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {latestData.commitHash.substring(0, 8)}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Text>{new Date(latestData.timeStamp).toISOString().split('T')[0]}<br />{new Date(latestData.timeStamp).toISOString().split('T')[1]?.replace('Z', '')}
        </Text>
      </Table.Td>
      <Table.Td style={{ width: ImageWidth }}>
        <ImageThumbnail
          type={'candidate'}
          group={record.group}
          name={record.name}
          hardware={record.hardware}
          stopPropagation
          width={ImageWidth}
        />
      </Table.Td>
      <Table.Td style={{ width: ImageWidth }}>
        <ImageThumbnail
          type={'reference'}
          group={record.group}
          name={record.name}
          hardware={record.hardware}
          stopPropagation
          width={ImageWidth}
        />
      </Table.Td>
      <Table.Td style={{ width: ImageWidth }}>
        <ImageThumbnail
          type={'difference'}
          group={record.group}
          name={record.name}
          hardware={record.hardware}
          stopPropagation
          width={ImageWidth}
        />
      </Table.Td>
    </Table.Tr>
  );
}
