import { describe, it, expect } from 'vitest'
import { OperationQueue } from '../../src/main/modules/operation-queue'

describe('OperationQueue', () => {
  it('executes operations serially', async () => {
    const queue = new OperationQueue()
    const order: number[] = []

    const op1 = queue.enqueue(async () => {
      await new Promise(r => setTimeout(r, 50))
      order.push(1)
      return 'a'
    })
    const op2 = queue.enqueue(async () => {
      order.push(2)
      return 'b'
    })

    const [r1, r2] = await Promise.all([op1, op2])
    expect(order).toEqual([1, 2])
    expect(r1).toBe('a')
    expect(r2).toBe('b')
  })

  it('continues after a failed operation', async () => {
    const queue = new OperationQueue()
    const op1 = queue.enqueue(async () => { throw new Error('fail') })
    const op2 = queue.enqueue(async () => 'ok')

    await expect(op1).rejects.toThrow('fail')
    expect(await op2).toBe('ok')
  })
})
