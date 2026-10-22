/**
 * Covers #1558: createImagePreview resolves with a data URL for the file's
 * contents and rejects when the FileReader fails.
 */

import { createImagePreview } from '../image';

const OriginalFileReader = globalThis.FileReader;

afterEach(() => {
  globalThis.FileReader = OriginalFileReader;
});

describe('createImagePreview', () => {
  it('resolves with a data URL for the file contents', async () => {
    const file = new File(['hello'], 'pixel.png', { type: 'image/png' });

    await expect(createImagePreview(file)).resolves.toBe('data:image/png;base64,aGVsbG8=');
  });

  it('rejects when the FileReader fails', async () => {
    class FailingFileReader {
      onerror: (() => void) | null = null;

      readAsDataURL() {
        this.onerror?.();
      }
    }
    globalThis.FileReader = FailingFileReader as unknown as typeof FileReader;

    const file = new File(['hello'], 'pixel.png', { type: 'image/png' });

    await expect(createImagePreview(file)).rejects.toThrow('Failed to read file');
  });
});
