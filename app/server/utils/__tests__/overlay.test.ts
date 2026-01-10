import { describe, expect, it } from 'vitest';
import { mergeArrayByIdPatches } from '@/server/utils/deepMerge';
describe('mergeArrayByIdPatches', () => {
  it('deep merges plain-object patches by id and leaves other entries unchanged', () => {
    const sourcePatches = {
      alpha: { foo: 'new', nested: { x: 1 } },
      beta: ['not', 'an', 'object'],
    };
    const targetArray = [
      { id: 'alpha', foo: 'old', nested: { y: 2 } },
      { id: 'beta', value: 123 },
      { noId: true },
    ];
    const result = mergeArrayByIdPatches(sourcePatches, targetArray);
    expect(result).toEqual([
      { id: 'alpha', foo: 'new', nested: { y: 2, x: 1 } },
      { id: 'beta', value: 123 },
      { noId: true },
    ]);
  });
});
