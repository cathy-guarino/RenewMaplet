import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * jsdom implements neither the Pointer Capture API nor `scrollIntoView`, both
 * of which Radix's Select uses while opening. Without these, interacting with
 * a Select throws in tests only. Shimming here rather than avoiding the
 * component keeps the tests exercising what ships.
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => undefined
  Element.prototype.releasePointerCapture = () => undefined
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}

afterEach(() => {
  cleanup()
  // Radix sets `pointer-events: none` on the body while an overlay is open and
  // restores it on close. A test that ends with one open leaves it set, and
  // user-event then silently refuses every click in the next test.
  document.body.style.pointerEvents = ''
})
