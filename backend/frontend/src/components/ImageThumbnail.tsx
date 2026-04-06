import { Anchor } from '@mantine/core';

interface Props {
  type: string;
  group: string;
  name: string;
  hardware: string;
  timestamp?: string;
  stopPropagation?: boolean;
  width: number;
}

export function ImageThumbnail({
  type,
  group,
  name,
  hardware,
  timestamp,
  stopPropagation = false,
  width
}: Props) {
  const timePart = timestamp ? `/${timestamp}` : '';
  return (
    <Anchor
      href={`/api/result/${type}/${group}/${name}/${hardware}${timePart}`}
      target={'_blank'}
      onClick={stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
    >
      <img
        src={`/api/result/${type}-thumbnail/${group}/${name}/${hardware}${timePart}`}
        style={{ width }}
        loading={'lazy'}
        alt={type}
      />
    </Anchor>
  );
}
