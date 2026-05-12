import { ActionIcon, Anchor, Table, Text, Tooltip } from '@mantine/core';

import { TestData, TestRecord } from '../types';
import { timingDisplay } from '../utils';

import { ImageThumbnail } from './ImageThumbnail';
import { PixelDiffNumber } from './PixelDiffNumber';

interface Props {
  record: TestRecord;
  onOpen: (record: TestRecord) => void;
}

enum Trend {
  Stable,
  Improved,
  Worsened,
  Erratic
};

function classifyValues(data: TestData[]): Trend {
  // `data` has the last up to 5 values
  if (data.length <= 1) return Trend.Stable;

  const errors = data.map((d) => d.pixelError);
  const diffs = errors.slice(1).map((v, i) => v - errors[i]);

  const anyIncrease = diffs.some((d) => d > 0);
  const anyDecrease = diffs.some((d) => d < 0);

  if (!anyIncrease && !anyDecrease) return Trend.Stable;
  if (anyIncrease && anyDecrease) return Trend.Erratic;
  if (anyDecrease) return Trend.Improved;
  return Trend.Worsened;
}

function logErrorsTrend(data: TestData[]): boolean {
  // Returns `true` if the number of log errors are acceptable, meaning that the last
  // entry has 0 errors **and** the number of log errors has been decreasing. Will return
  // `false` otherwise
  if (data.length === 0) return true;
  const vals = data.map((d) => d.nErrors);
  if (vals[vals.length - 1] !== 0) return false;
  const diffs = vals.slice(1).map((v, i) => v - vals[i]);
  return !diffs.some((d) => d > 0);
}

export function TestRow({ record, onOpen }: Props) {
  if (record.data.length == 0) return null;

  const latestData = record.data[record.data.length - 1];
  if (!latestData) return null;



  const ImageWidth = 250;

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('group', record.group);
    url.searchParams.set('name', record.name);
    url.searchParams.set('hardware', record.hardware);
    navigator.clipboard.writeText(url.toString());
  }

  let lastValues = record.data.slice(record.data.length - 5);
  let diffTrend = classifyValues(lastValues);
  const [diffColor, diffText, diffTooltip] = (function (trend: Trend) {
    switch (trend) {
      case Trend.Stable:
        return ['dimmed', '● Stable', 'Pixel error of the last 5 tests is unchanged'];
      case Trend.Improved:
        return ['green', '↓ Improved', 'Pixel error of the last 5 tests has improved'];
      case Trend.Worsened:
        return ['red', '↑ Worsened', 'Pixel error of the last 5 tests has gotten worse'];
      case Trend.Erratic:
        return ['yellow', '~ Erratic', 'Pixel error of the last 5 tests is going up and down'];
    }
  })(diffTrend);

  const nErrorsTrendGood = logErrorsTrend(lastValues);
  const [nErrorsColor, nErrorsText, nErrorsTooltip] =
    nErrorsTrendGood ?
    ['dimmed', 'No errors', 'No log errors reported'] :
    ['red', `${latestData.nErrors} errors`, 'Log errors have worsened'];

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={() => onOpen(record)}>
      <Table.Td style={{ whiteSpace: 'nowrap' }}>
        <PixelDiffNumber value={latestData.pixelError} />
        <Tooltip label={diffTooltip} withArrow>
          <Text size={'xs'} c={diffColor}>{diffText}</Text>
        </Tooltip>
        <Tooltip label={nErrorsTooltip} withArrow>
          <Text size={'xs'} c={nErrorsColor}>{nErrorsText}</Text>
        </Tooltip>
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
        <Text>
          {new Date(latestData.timeStamp).toISOString().split('T')[0]}
          <br />
          {new Date(latestData.timeStamp).toISOString().split('T')[1]?.replace('Z', '')}
        </Text>
      </Table.Td>
      <Table.Td>
        <Tooltip label={'Copy link'} withArrow>
          <ActionIcon
            variant={'subtle'}
            size={'xs'}
            mt={4}
            onClick={copyLink}
            aria-label={'Copy link to this test'}
          >
            🔗
          </ActionIcon>
        </Tooltip>
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
