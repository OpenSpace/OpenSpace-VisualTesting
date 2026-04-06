import { Anchor } from '@mantine/core'

export function ImageThumbnail({
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
