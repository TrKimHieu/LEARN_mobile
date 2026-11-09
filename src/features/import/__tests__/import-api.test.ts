import { useImportText } from '../import-api';

const mockMutation = jest.fn((options) => options);
const mockInvalidate = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useMutation: (o: unknown) => mockMutation(o),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@/lib/api-client', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

it('POSTs text to the course endpoint and invalidates documents', async () => {
  useImportText('c1');
  const { mutationFn, onSuccess } = mockMutation.mock.calls[0]![0];
  const input = { filename: 'a.txt', sourceMimeType: 'text/plain', sourceSizeBytes: 1, method: 'TEXT', pages: [{ page: null, text: 'x' }] };
  mockApiFetch.mockResolvedValue([]);
  await mutationFn(input);
  expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/courses/c1/documents/text', { method: 'POST', body: input });
  onSuccess();
  expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['courses', 'c1', 'documents'] });
});
