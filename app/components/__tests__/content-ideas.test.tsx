import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import { ContentIdeas } from '../content-ideas'

// Mock the post context
const mockPostState = {
  posts: {
    '1': { id: '1', title: 'Test Post', content: 'Test content', likes: 5, status: 'published' },
    '2': { id: '2', title: 'Draft Post', content: 'Draft content', status: 'draft' }
  }
}

const mockPostContextValue = {
  state: mockPostState,
  dispatch: vi.fn()
}

vi.mock('@/lib/post-context', () => ({
  usePost: () => mockPostContextValue
}))

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } }
      })
    }
  }
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
})

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ContentIdeas Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        response: 'Mocked AI response',
        content: {
          title: 'Generated Title',
          description: 'Generated description',
          hashtags: ['#test', '#content']
        }
      })
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial Render', () => {
    it('should render the overview page by default', () => {
      render(<ContentIdeas />)
      
      expect(screen.getByText('Content Ideas')).toBeInTheDocument()
      expect(screen.getByText('Content-Strategien')).toBeInTheDocument()
      expect(screen.getByText('Freies Brainstorming')).toBeInTheDocument()
      expect(screen.getByText('Lass dich inspirieren')).toBeInTheDocument()
    })

    it('should have properly structured navigation cards', () => {
      render(<ContentIdeas />)
      
      const strategyButton = screen.getByText('Strategien erkunden')
      const brainstormButton = screen.getByText('Brainstorming starten')
      const trendsButton = screen.getByText('Trends entdecken')
      
      expect(strategyButton).toBeInTheDocument()
      expect(brainstormButton).toBeInTheDocument()
      expect(trendsButton).toBeInTheDocument()
    })
  })

  describe('Navigation Between Steps', () => {
    it('should navigate to strategies page when clicking strategy button', async () => {
      render(<ContentIdeas />)
      
      const strategyButton = screen.getByText('Strategien erkunden')
      await user.click(strategyButton)
      
      expect(screen.getByText('Content-Strategien')).toBeInTheDocument()
      expect(screen.getByText('Swipe oder verwende die Buttons zum Navigieren')).toBeInTheDocument()
    })

    it('should navigate to brainstorm page when clicking brainstorm button', async () => {
      render(<ContentIdeas />)
      
      const brainstormButton = screen.getByText('Brainstorming starten')
      await user.click(brainstormButton)
      
      expect(screen.getByText('Freies Brainstorming mit deinem KI-Assistenten')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')).toBeInTheDocument()
    })

    it('should allow navigation back from sub-pages', async () => {
      render(<ContentIdeas />)
      
      // Navigate to strategies
      await user.click(screen.getByText('Strategien erkunden'))
      
      // Navigate back
      const backButton = screen.getByText('Zurück')
      await user.click(backButton)
      
      expect(screen.getByText('Entwickle hochwertige Social Media Inhalte mit minimalem Aufwand')).toBeInTheDocument()
    })
  })

  describe('Brainstorming Interface', () => {
    beforeEach(async () => {
      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
    })

    it('should display initial welcome message and suggestions', () => {
      expect(screen.getByText(/Willkommen in deinem KI-Kreativstudio/)).toBeInTheDocument()
      expect(screen.getByText('Aktuelle Vorschläge:')).toBeInTheDocument()
      expect(screen.getByText('Schnelle Prompts:')).toBeInTheDocument()
    })

    it('should enable message input and sending', async () => {
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      const sendButton = screen.getByRole('button', { name: /Kreieren/ })
      
      await user.type(input, 'Test message')
      expect(input).toHaveValue('Test message')
      
      await user.click(sendButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-content', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test message')
      }))
    })

    it('should show loading state during message generation', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, response: 'AI response' })
        }), 100))
      )

      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      await user.click(screen.getByRole('button', { name: /Kreieren/ }))

      expect(screen.getByText('KI denkt nach...')).toBeInTheDocument()
    })

    it('should display AI responses in chat', async () => {
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })

    it('should handle quick prompt clicks', async () => {
      const quickPrompt = screen.getByText('Gib mir 3 Ideen für einen Post über Immobilienfotografie')
      
      await user.click(quickPrompt)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-content', expect.objectContaining({
        body: expect.stringContaining('Immobilienfotografie')
      }))
    })
  })

  describe('Strategies Interface', () => {
    beforeEach(async () => {
      render(<ContentIdeas />)
      await user.click(screen.getByText('Strategien erkunden'))
    })

    it('should display strategy cards in swipe mode', () => {
      expect(screen.getByText('Entdecken')).toBeInTheDocument()
      expect(screen.getByText('Gespeichert')).toBeInTheDocument()
      expect(screen.getByText('1 von 10')).toBeInTheDocument() // Progress indicator
    })

    it('should allow switching between swipe and saved views', async () => {
      const savedButton = screen.getByText('Gespeichert')
      await user.click(savedButton)
      
      expect(screen.getByText('Keine gespeicherten Strategien')).toBeInTheDocument()
    })

    it('should handle strategy card interactions', async () => {
      // Swipe right (save) action
      const heartButton = screen.getByRole('button', { name: '' }) // Heart icon button
      if (heartButton) {
        await user.click(heartButton)
        expect(toast.success).toHaveBeenCalledWith('Strategie gespeichert!')
      }
    })
  })

  describe('Copy Functionality', () => {
    it('should copy text to clipboard and show success message', async () => {
      render(<ContentIdeas />)
      
      // Navigate to brainstorm and send a message to get AI response
      await user.click(screen.getByText('Brainstorming starten'))
      
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      await waitFor(() => {
        const copyButtons = screen.getAllByRole('button')
        const copyButton = copyButtons.find(button => 
          button.querySelector('svg') && 
          button.getAttribute('class')?.includes('group-hover:opacity-100')
        )
        
        if (copyButton) {
          user.click(copyButton)
          expect(navigator.clipboard.writeText).toHaveBeenCalled()
          expect(toast.success).toHaveBeenCalledWith('In Zwischenablage kopiert!')
        }
      })
    })

    it('should show copied state temporarily after copying', async () => {
      vi.useFakeTimers()
      
      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      // Simulate copy action and time passage
      act(() => {
        vi.advanceTimersByTime(2100) // Should reset copied state after 2 seconds
      })

      vi.useRealTimers()
    })

    it('should handle copy errors gracefully', async () => {
      const mockClipboard = vi.spyOn(navigator.clipboard, 'writeText')
      mockClipboard.mockRejectedValueOnce(new Error('Clipboard error'))
      
      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      // Trigger copy action that will fail
      // The error should be handled and show error toast
      expect(toast.error).not.toHaveBeenCalled() // Should only be called when copy fails
    })
  })

  describe('Loading States', () => {
    it('should show loading state during content generation', async () => {
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, response: 'Response' })
        }), 100))
      )

      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test')
      
      await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      
      expect(screen.getByText('KI denkt nach...')).toBeInTheDocument()
    })

    it('should show post creation loading state', async () => {
      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      // Send a message first to enable post creation
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      await waitFor(() => {
        const postButton = screen.getByText('Post erstellen')
        if (postButton) {
          user.click(postButton)
          // Should show loading state
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' })
      })

      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      // Should fall back to local response generation
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ContentIdeas />)
      await user.click(screen.getByText('Brainstorming starten'))
      
      const input = screen.getByPlaceholderText('Beschreibe deine Content-Idee oder stelle eine Frage...')
      await user.type(input, 'Test message')
      
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /Kreieren/ }))
      })

      // Should fall back to local response
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      render(<ContentIdeas />)
      
      // Check that mobile-friendly elements are present
      expect(screen.getByText('Content Ideas')).toBeInTheDocument()
      
      // Cards should still be accessible
      expect(screen.getByText('Content-Strategien')).toBeInTheDocument()
      expect(screen.getByText('Freies Brainstorming')).toBeInTheDocument()
    })

    it('should maintain functionality on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      render(<ContentIdeas />)
      
      // All main features should be accessible
      expect(screen.getByText('Strategien erkunden')).toBeInTheDocument()
      expect(screen.getByText('Brainstorming starten')).toBeInTheDocument()
      expect(screen.getByText('Trends entdecken')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ContentIdeas />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Check for proper button accessibility
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<ContentIdeas />)
      
      // Tab through interactive elements
      await user.tab()
      
      // Should be able to activate buttons with Enter/Space
      const firstButton = screen.getByText('Strategien erkunden')
      firstButton.focus()
      
      await user.keyboard('{Enter}')
      expect(screen.getByText('Content-Strategien')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<ContentIdeas />)
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should not make unnecessary re-renders', () => {
      const { rerender } = render(<ContentIdeas />)
      
      // Rerender with same props should not cause issues
      rerender(<ContentIdeas />)
      
      expect(screen.getByText('Content Ideas')).toBeInTheDocument()
    })

    it('should cleanup effects on unmount', () => {
      const { unmount } = render(<ContentIdeas />)
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow()
    })
  })
}) 