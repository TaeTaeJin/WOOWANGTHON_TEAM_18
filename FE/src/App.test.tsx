import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it } from 'vitest'
import App from './App.tsx'

const renderApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const h1 = () => screen.getByRole('heading', { level: 1 }).textContent

it('shows the archive landing at the root path', () => {
  renderApp('/')
  expect(h1()).toBe('GitHub 레포 하나로, 학교 PC에 배포까지')
})

// 서버와 로그인이 내려갔으므로 옛 화면 주소는 모두 랜딩으로 간다.
it.each(['/login', '/signup', '/reset-password', '/dashboard', '/profile', '/deploy/new', '/deploys', '/deploys/abc', '/admin', '/nowhere'])(
  '%s redirects to the landing',
  (path) => {
    renderApp(path)
    expect(h1()).toBe('GitHub 레포 하나로, 학교 PC에 배포까지')
  },
)
