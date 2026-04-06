import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Anchor, Box, Button, Group, Select, Table, Text, TextInput, Title,
} from '@mantine/core'
import { TestRecord } from '../types'
import { diffDisplay, diffStyle } from '../utils'

type ImageType = 'reference' | 'candidate'

function CompareCell({
  type,
  group,
  name,
  hardware1,
  hardware2,
}: {
  type: string
  group: string
  name: string
  hardware1: string
  hardware2: string
}) {
  const [pixelError, setPixelError] = useState<number | null>(null)
  const compareUrl = `/api/compare/${type}/${group}/${name}/${hardware1}/${hardware2}`

  useEffect(() => {
    fetch(compareUrl).then(res => {
      setPixelError(Number(res.headers.get('result')))
    })
  }, [compareUrl])

  return (
    <Table.Td style={{ backgroundColor: '#252525', border: '0.5px solid #eeeeee', textAlign: 'center' }}>
      <Anchor href={compareUrl} target="_blank">
        <img
          src={compareUrl}
          alt={`${hardware1} vs ${hardware2}`}
          style={{ width: 150, height: 84.375 }}
        />
      </Anchor>
      {pixelError !== null && (
        <Box px={4} mt={2} style={{ borderRadius: 4, display: 'inline-block', ...diffStyle(pixelError) }}>
          <Text size="sm">{diffDisplay(pixelError)}</Text>
        </Box>
      )}
    </Table.Td>
  )
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [group, setGroup] = useState(searchParams.get('group') ?? '')
  const [name, setName] = useState(searchParams.get('name') ?? '')
  const [type, setType] = useState<ImageType>(
    (searchParams.get('type') as ImageType | null) ?? 'reference',
  )
  const [hardwares, setHardwares] = useState<string[]>([])
  const [hasResult, setHasResult] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // Track current generation params (separate from input state)
  const resultParams = useRef({ group, name, type })

  async function generateComparison(g: string, n: string, t: ImageType) {
    const records: TestRecord[] = await fetch('/api/test-records').then(res =>
      res.json(),
    )
    const hwList = [...new Set(records.map(r => r.hardware))].sort()
    resultParams.current = { group: g, name: n, type: t }
    setHardwares(hwList)
    setHasResult(true)
    const loc = `${location.protocol}//${location.host}${location.pathname}`
    setShareUrl(`${loc}?group=${g}&name=${n}&type=${t}`)
  }

  // Auto-generate if URL params are present on mount
  useEffect(() => {
    const urlGroup = searchParams.get('group')
    const urlName = searchParams.get('name')
    const urlType =
      (searchParams.get('type') as ImageType | null) ?? 'reference'
    if (urlGroup && urlName) {
      generateComparison(urlGroup, urlName, urlType)
    }
    // Intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleGenerate() {
    setSearchParams({ group, name, type })
    generateComparison(group, name, type)
  }

  const { group: rGroup, name: rName, type: rType } = resultParams.current

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

      {/* Input fields */}
      <Group p="sm" align="flex-end" style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
        <TextInput
          label="Group"
          size="sm"
          value={group}
          onChange={e => setGroup(e.target.value)}
        />
        <TextInput
          label="Name"
          size="sm"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Select
          label="Type"
          size="sm"
          w={160}
          value={type}
          onChange={val => setType((val ?? 'reference') as ImageType)}
          data={[
            { value: 'reference', label: 'Reference' },
            { value: 'candidate', label: 'Candidate' },
          ]}
        />
        <Button onClick={handleGenerate} autoFocus>
          Generate
        </Button>
      </Group>

      {shareUrl && (
        <Box px="sm" py="xs">
          <Anchor href={shareUrl} size="sm">{shareUrl}</Anchor>
        </Box>
      )}

      {hasResult && (
        <Table id="splom" withColumnBorders withTableBorder>
          <Table.Tbody>
            {hardwares.map((hw, i) => (
              <Table.Tr key={hw}>
                {/* Lower triangle: empty cells */}
                {hardwares.slice(0, i).map((_, j) => (
                  <Table.Td key={j} />
                ))}
                {/* Diagonal: single hardware image */}
                <Table.Td style={{ backgroundColor: '#252525', border: '0.5px solid #eeeeee', textAlign: 'center' }}>
                  <Anchor
                    href={`/api/result/${rType}/${rGroup}/${rName}/${hw}`}
                    target="_blank"
                  >
                    <img
                      src={`/api/result/${rType}-thumbnail/${rGroup}/${rName}/${hw}`}
                      alt={hw}
                      style={{ width: 150, height: 84.375 }}
                    />
                  </Anchor>
                  <Text size="sm" ta="center">{hw}</Text>
                </Table.Td>
                {/* Upper triangle: cross-hardware comparisons */}
                {hardwares.slice(i + 1).map(hw2 => (
                  <CompareCell
                    key={hw2}
                    type={rType}
                    group={rGroup}
                    name={rName}
                    hardware1={hw}
                    hardware2={hw2}
                  />
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  )
}
