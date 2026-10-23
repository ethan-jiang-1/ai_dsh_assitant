/**
 * The prompt markers that tell the model which door a line came through. The desk's capture lane
 * is note-first; the one-page home's lane must produce a page (2026-10-23: reusing the desk marker
 * made the live model note the line and ask a question instead of writing the page).
 */
import { describe, expect, it } from 'vitest'
import { deskCaptureRequest, homePageRequest } from '../../src/client/rooms/prompt-bridge'

describe('capture lane markers', () => {
  it('the desk capture line carries the desk marker', () => {
    const request = deskCaptureRequest('session-1', '北边的仓库月底到期')
    expect(request.requestId.startsWith('desk-capture-')).toBe(true)
    expect(request.content[0]?.text).toBe('[桌面] 北边的仓库月底到期')
  })

  it('the one-page home line carries the home marker, not the desk marker', () => {
    const request = homePageRequest('session-1', '我下季度销售掉了20%')
    expect(request.requestId.startsWith('home-page-')).toBe(true)
    expect(request.content[0]?.text).toBe('[首页] 我下季度销售掉了20%')
    expect(request.content[0]?.text).not.toContain('[桌面]')
  })
})
