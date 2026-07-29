import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Intro } from './intro'

afterEach(cleanup)

describe('Intro', () => {
  it('leads with the brand logo and slogan instead of a text wordmark', () => {
    render(<Intro personality="helpful" seed={1} />)

    expect(screen.getByRole('img', { name: '萌学伴 Logo' })).toBeTruthy()
    expect(screen.getByText('以科技行因材施教，以普惠守有教无类')).toBeTruthy()
    expect(screen.queryByText('萌学伴')).toBeNull()
  })
})
