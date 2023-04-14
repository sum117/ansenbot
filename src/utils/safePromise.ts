export default async function safePromise<T>(
  promise: Promise<T>
): Promise<readonly [null, Error] | readonly [NonNullable<Awaited<T>>, null]> {
  try {
    const data = await promise;
    if (!data) {
      return [null, new Error("No data")] as const;
    }
    return [data, null] as const;
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(error as string)] as const;
  }
}
