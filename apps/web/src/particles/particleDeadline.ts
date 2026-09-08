/** A deadline is a failure boundary, never evidence that GPU work is ready. */
export async function particleDeadline<T>(work: Promise<T>, milliseconds = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Particle GPU operation timed out")), milliseconds);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
