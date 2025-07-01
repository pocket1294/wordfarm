'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnterPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const correctPassword = 'loophole' // あいことば

  function onSubmit() {
    if (password === correctPassword) {
      router.push('/post')
    } else {
      setError('Wrong word. Try again.')
    }
  }

  return (
    <div style={{ maxWidth: 320, margin: 'auto', padding: 10, textAlign: 'center' }}>
      <h2>Enter the secret word.</h2>
      <div style={{ display: 'flex', marginTop: 12 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError('') }}
          placeholder="secret word"
          style={{
            flex: 1,
            height: 40,
            fontSize: 16,
            borderRadius: '4px 0 0 4px',
            border: '1px solid #ccc',
            borderRight: 'none',
            textAlign: 'center',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
        <button
          onClick={onSubmit}
          style={{
            height: 40,
            fontSize: 16,
            cursor: 'pointer',
            borderRadius: '0 4px 4px 0',
            border: '1px solid #ccc',
            backgroundColor: '#f0f0f0',
          }}
        >
          go
        </button>
      </div>
      <p style={{ color: 'red', minHeight: 24, fontWeight: 'bold', marginTop: 10 }}>{error}</p>
    </div>
  )
}
