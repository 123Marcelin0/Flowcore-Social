import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ContentIdeasOverview } from '../content-ideas/steps/ContentIdeasOverview'

describe('ContentIdeasOverview Component', () => {
  const user = userEvent.setup()
  const setCurrentStep = vi.fn()
  const triggerSuccessAnimation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the overview page with all cards', () => {
    render(
      <ContentIdeasOverview
        showSuccessAnimation={false}
        setCurrentStep={setCurrentStep}
        triggerSuccessAnimation={triggerSuccessAnimation}
      />
    )

    expect(screen.getByText('Content-Strategien')).toBeInTheDocument()
    expect(screen.getByText('KI-Brainstorming')).toBeInTheDocument()
    expect(screen.getByText('Content Inspiration')).toBeInTheDocument()
  })

  it('should call setCurrentStep with "strategies" when the strategy card button is clicked', async () => {
    render(
      <ContentIdeasOverview
        showSuccessAnimation={false}
        setCurrentStep={setCurrentStep}
        triggerSuccessAnimation={triggerSuccessAnimation}
      />
    )
    const strategyButton = screen.getByText('Strategien erkunden')
    await user.click(strategyButton)
    expect(setCurrentStep).toHaveBeenCalledWith('strategies')
  })

  it('should call setCurrentStep with "brainstorm" when the brainstorm card button is clicked', async () => {
    render(
      <ContentIdeasOverview
        showSuccessAnimation={false}
        setCurrentStep={setCurrentStep}
        triggerSuccessAnimation={triggerSuccessAnimation}
      />
    )
    const brainstormButton = screen.getByText('Brainstorming starten')
    await user.click(brainstormButton)
    expect(setCurrentStep).toHaveBeenCalledWith('brainstorm')
  })

  it('should call setCurrentStep with "inspiration" when the inspiration card button is clicked', async () => {
    render(
      <ContentIdeasOverview
        showSuccessAnimation={false}
        setCurrentStep={setCurrentStep}
        triggerSuccessAnimation={triggerSuccessAnimation}
      />
    )
    const inspirationButton = screen.getByText('Inspiration entdecken')
    await user.click(inspirationButton)
    expect(setCurrentStep).toHaveBeenCalledWith('inspiration')
  })
})
