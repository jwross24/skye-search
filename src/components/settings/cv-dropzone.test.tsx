import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CvDropzone } from './cv-dropzone'

vi.mock('@/app/settings/actions', () => ({
  uploadCv: vi.fn().mockResolvedValue({
    success: true,
    documentId: 'doc-1',
    filePath: 'user-1/cv_123.pdf',
  }),
}))

describe('CvDropzone', () => {
  const onExtracted = vi.fn()

  it('renders drop zone with guardrail warning', () => {
    render(<CvDropzone onExtracted={onExtracted} />)

    expect(screen.getByText(/drop your cv here to get started/i)).toBeInTheDocument()
    expect(screen.getByText(/pdf or docx/i)).toBeInTheDocument()
    expect(screen.getByText(/heads up/i)).toBeInTheDocument()
    expect(screen.getByText(/personal info/i)).toBeInTheDocument()
  })

  it('has a hidden file input accepting PDF and DOCX', () => {
    render(<CvDropzone onExtracted={onExtracted} />)

    const input = screen.getByLabelText(/upload cv/i) as HTMLInputElement
    expect(input.type).toBe('file')
    expect(input.accept).toContain('application/pdf')
    expect(input.accept).toContain('.docx')
  })

  it('calls uploadCv and onExtracted when a PDF file is selected', async () => {
    const user = userEvent.setup()
    const { uploadCv } = await import('@/app/settings/actions')

    render(<CvDropzone onExtracted={onExtracted} />)

    const input = screen.getByLabelText(/upload cv/i)
    const file = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' })

    await user.upload(input, file)

    expect(uploadCv).toHaveBeenCalled()
    expect(onExtracted).toHaveBeenCalledWith({
      documentId: 'doc-1',
      filePath: 'user-1/cv_123.pdf',
    })
  })

  it('shows error for unsupported file types via drag-and-drop', async () => {
    render(<CvDropzone onExtracted={onExtracted} />)

    const dropzone = screen.getByText(/drop your cv here to get started/i).closest('button')!
    const file = new File(['image data'], 'photo.png', { type: 'image/png' })
    const dataTransfer = { files: [file], types: ['Files'] }

    await userEvent.setup().pointer([
      { target: dropzone, keys: '[MouseLeft]' },
    ])
    // Fire drop event manually since userEvent doesn't have a drop helper
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer })
    Object.defineProperty(dropEvent, 'preventDefault', { value: vi.fn() })
    dropzone.dispatchEvent(dropEvent)

    expect(await screen.findByRole('alert')).toHaveTextContent(/only pdf and docx/i)
  })

  it('shows error when upload fails', async () => {
    const user = userEvent.setup()
    const { uploadCv } = await import('@/app/settings/actions')
    vi.mocked(uploadCv).mockResolvedValueOnce({
      success: false,
      error: 'Upload failed: storage error',
    })

    render(<CvDropzone onExtracted={vi.fn()} />)

    const input = screen.getByLabelText(/upload cv/i)
    const file = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' })

    await user.upload(input, file)

    expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i)
  })
})
