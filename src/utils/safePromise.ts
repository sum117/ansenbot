export default async function safePromise<T>(
  promise: Promise<T>
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    if (!data) {
      return [null, new Error("No data")];
    }
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(error as string)];
  }
}
