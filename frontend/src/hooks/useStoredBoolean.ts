import { useCallback, useState } from 'react';

import { readJson, writeJson, type StorageLike } from '@/lib/storage/jsonStorage';

const parseBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

/**
 * A boolean preference that survives reloads. Storage is passed in so callers
 * decide where it lives and tests need no global.
 */
export function useStoredBoolean(
  storage: StorageLike,
  key: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => readJson(storage, key, parseBoolean) ?? defaultValue);

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      writeJson(storage, key, next);
    },
    [storage, key],
  );

  return [value, update];
}
