import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TestRecord, TestData } from '../types'
import { classForDiff, diffDisplay, timingDisplay } from '../utils'
import '../styles/home.css'

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

function ImageCell({ type, record }: { type: string; record: TestRecord }) {
  return (
    <div className={`cell ${type}`}>
      <a
        href={`/api/result/${type}/${record.group}/${record.name}/${record.hardware}`}
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={`/api/result/${type}-thumbnail/${record.group}/${record.name}/${record.hardware}`}
          className="overview"
          loading="lazy"
          alt={type}
        />
      </a>
    </div>
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

  function imageCell(type: string, data: TestData) {
    return (
      <td key={data.timeStamp} className={type}>
        <a
          href={`/api/result/${type}/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={`/api/result/${type}-thumbnail/${record.group}/${record.name}/${record.hardware}/${data.timeStamp}`}
            loading="lazy"
            alt={type}
          />
        </a>
      </td>
    )
  }

  return (
    <table className="history">
      <tbody>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className={`status-small ${classForDiff(d.pixelError)}`} />
          ))}
        </tr>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className="timestamp">
              {new Date(d.timeStamp).toUTCString()}
            </td>
          ))}
        </tr>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className="diff">
              {diffDisplay(d.pixelError)}
            </td>
          ))}
        </tr>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className="commit">
              <a
                href={`https://github.com/OpenSpace/OpenSpace/commit/${d.commitHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {d.commitHash}
              </a>
            </td>
          ))}
        </tr>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className="timing">
              {timingDisplay(d.timing)}
            </td>
          ))}
        </tr>
        <tr>
          <td />
          {testData.map(d => (
            <td key={d.timeStamp} className="log">
              <a
                href={`/api/result/log/${record.group}/${record.name}/${record.hardware}/${d.timeStamp}`}
                target="_blank"
                rel="noreferrer"
              >
                Log file ({d.nErrors} errors)
              </a>
            </td>
          ))}
        </tr>
        <tr>
          <td className="table-label">Candidate</td>
          {testData.map(d => imageCell('candidate', d))}
        </tr>
        <tr>
          <td className="table-label">Reference</td>
          {testData.map(d => imageCell('reference', d))}
        </tr>
        <tr>
          <td className="table-label">Difference</td>
          {testData.map(d => imageCell('difference', d))}
        </tr>
        <tr>
          <td />
          <td>
            <button onClick={() => onUpdateReference(record)}>
              Upgrade Candidate to Reference
            </button>
          </td>
          {testData.slice(1).map(d => (
            <td key={d.timeStamp} />
          ))}
        </tr>
      </tbody>
    </table>
  )
}

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
    <li className="row">
      <div className="head" onClick={() => setExpanded(e => !e)}>
        <div className={`cell status ${classForDiff(latestData.pixelError)}`}>
          {diffDisplay(latestData.pixelError)}
        </div>
        <div className="cell group">{record.group}</div>
        <div className="cell name">{record.name}</div>
        <div className="cell hardware">{record.hardware}</div>
        <div className="cell timing">{timingDisplay(latestData.timing)}</div>
        <div className="cell commit">
          <a
            href={`https://github.com/OpenSpace/OpenSpace/commit/${latestData.commitHash}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
          >
            {latestData.commitHash}
          </a>
        </div>
        <div className="cell timestamp">
          {new Date(latestData.timeStamp).toISOString()}
        </div>
        <ImageCell type="candidate" record={record} />
        <ImageCell type="reference" record={record} />
        <ImageCell type="difference" record={record} />
      </div>
      {expanded && (
        <div className="body">
          <TestHistory record={record} onUpdateReference={onUpdateReference} />
        </div>
      )}
    </li>
  )
}

function HardwareFilter({
  allHardware,
  selectedHardware,
  onToggle,
  onSelectAll,
  onSelectOnly,
}: {
  allHardware: string[]
  selectedHardware: Set<string>
  onToggle: (hw: string) => void
  onSelectAll: () => void
  onSelectOnly: (hw: string) => void
}) {
  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === 'all') {
      onSelectAll()
    } else {
      onSelectOnly(e.target.value)
    }
  }

  return (
    <>
      <li>
        <select onChange={handleSelectChange} defaultValue="all">
          <option value="all">All</option>
          {allHardware.map(hw => (
            <option key={hw} value={hw}>
              {hw}
            </option>
          ))}
        </select>
      </li>
      {allHardware.map(hw => (
        <li key={hw}>
          <input
            type="checkbox"
            id={`hardware-${hw}`}
            className="hardware-checkbox"
            checked={selectedHardware.has(hw)}
            onChange={() => onToggle(hw)}
            value={hw}
          />
          <label htmlFor={`hardware-${hw}`}>{hw}</label>
        </li>
      ))}
    </>
  )
}

function SortableHeader({
  className,
  sortKey,
  label,
  onSort,
}: {
  className: string
  sortKey: SortColumn
  label: string
  onSort: (col: SortColumn) => void
}) {
  return (
    <div className={`cell ${className}`} onClick={() => onSort(sortKey)}>
      {label}
    </div>
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
    <div>
      <h1>
        <Link to="/">OpenSpace Image Testing</Link>
      </h1>
      <Link to="/compare" className="compare-panel">
        Hardware Compare
      </Link>
      <div className="control">
        <ul className="hardware-list">
          <li>Hardware Filtering:</li>
          <HardwareFilter
            allHardware={allHardware}
            selectedHardware={selectedHardware}
            onToggle={toggleHardware}
            onSelectAll={() => setSelectedHardware(new Set(allHardware))}
            onSelectOnly={hw => setSelectedHardware(new Set([hw]))}
          />
        </ul>
        <ul className="admin-list">
          <li>Admin:</li>
          <li>
            <input
              type="password"
              value={adminToken}
              onChange={e => setAdminToken(e.target.value)}
            />
          </li>
        </ul>
      </div>
      <ul>
        <li className="heading">
          <SortableHeader
            className="status"
            sortKey="pixelError"
            label="Error"
            onSort={handleSort}
          />
          <SortableHeader
            className="group"
            sortKey="group"
            label="Group"
            onSort={handleSort}
          />
          <SortableHeader
            className="name"
            sortKey="name"
            label="Name"
            onSort={handleSort}
          />
          <SortableHeader
            className="hardware"
            sortKey="hardware"
            label="Hardware"
            onSort={handleSort}
          />
          <SortableHeader
            className="timing"
            sortKey="timing"
            label="Timing"
            onSort={handleSort}
          />
          <SortableHeader
            className="commit"
            sortKey="commitHash"
            label="Commit"
            onSort={handleSort}
          />
          <SortableHeader
            className="timestamp"
            sortKey="timeStamp"
            label="Timestamp"
            onSort={handleSort}
          />
        </li>
        {visibleRecords.map(record => (
          <TestRow
            key={`${record.group}-${record.name}-${record.hardware}`}
            record={record}
            onUpdateReference={updateReference}
          />
        ))}
      </ul>
    </div>
  )
}
