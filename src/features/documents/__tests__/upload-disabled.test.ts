import { useUploadDocument } from '../documents-api';
const mockMutation = jest.fn((options) => options);
jest.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => mockMutation(options),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

it('blocks legacy original upload before any network or native file operation', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  useUploadDocument('course-1');
  const { mutationFn } = mockMutation.mock.calls[0]![0];
  await expect(mutationFn({ name: 'private.pdf', uri: 'file:///private.pdf' })).rejects.toThrow(/thiết bị/);
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
