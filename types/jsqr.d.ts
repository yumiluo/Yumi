declare module 'jsqr' {
  export interface QRCode {
    data: string
    location: {
      topLeftCorner: { x: number; y: number }
      topRightCorner: { x: number; y: number }
      bottomLeftCorner: { x: number; y: number }
      bottomRightCorner: { x: number; y: number }
    }
  }

  export default function jsQR(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: 'dontInvert' | 'attemptBoth' | 'onlyInvert'
    }
  ): QRCode | null
}
