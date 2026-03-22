export class OperationQueue {
  private queue: Promise<unknown> = Promise.resolve()

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(
      () => operation(),
      () => operation()
    )
    this.queue = result.then(() => {}, () => {})
    return result
  }
}
