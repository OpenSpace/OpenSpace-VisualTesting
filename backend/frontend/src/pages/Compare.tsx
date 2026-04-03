import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TestRecord } from '../types'
import { classForDiff, diffDisplay } from '../utils'
import '../styles/compare.css'

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
    <td className="comparison">
      <a href={compareUrl} target="_blank" rel="noreferrer">
        <img src={compareUrl} alt={`${hardware1} vs ${hardware2}`} />
      </a>
      {pixelError !== null && (
        <div className={`info ${classForDiff(pixelError)}`}>
          {diffDisplay(pixelError)}
        </div>
      )}
    </td>
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
    <div>
      <h1>
        <Link to="/">OpenSpace Image Testing</Link>
      </h1>
      <div className="input-fields">
        <div>
          Group:{' '}
          <input
            type="text"
            value={group}
            onChange={e => setGroup(e.target.value)}
          />
        </div>
        <div>
          Name:{' '}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          Type:{' '}
          <select
            value={type}
            onChange={e => setType(e.target.value as ImageType)}
          >
            <option value="reference">Reference</option>
            <option value="candidate">Candidate</option>
          </select>
        </div>
        <div>
          <button onClick={handleGenerate} autoFocus>
            Generate
          </button>
        </div>
      </div>

      {shareUrl && (
        <a href={shareUrl} className="url">
          {shareUrl}
        </a>
      )}

      {hasResult && (
        <table id="splom">
          <tbody>
            {hardwares.map((hw, i) => (
              <tr key={hw}>
                {/* Lower triangle: empty cells */}
                {hardwares.slice(0, i).map((_, j) => (
                  <td key={j} />
                ))}
                {/* Diagonal: single hardware image */}
                <td className="comparison">
                  <a
                    href={`/api/result/${rType}/${rGroup}/${rName}/${hw}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={`/api/result/${rType}-thumbnail/${rGroup}/${rName}/${hw}`}
                      alt={hw}
                    />
                  </a>
                  <div className="info">{hw}</div>
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
