'use client'

import { useEffect, useRef } from 'react'

interface Ripple {
  radius: number
  maxRadius: number
  opacity: number
  color: string
  strokeWidth: number
}

interface AsciiNote {
  x: number
  y: number
  angle: number
  opacity: number
  distance: number
}

export default function RippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const ripples: Ripple[] = []
    const asciiNotes: AsciiNote[] = []
    let lastBurst = 0
    let time = 0

    // Bayer 4x4 dither matrix
    const bayer4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ]

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Draw Bayer dithered dot field
    const drawDitherField = (time: number) => {
      const scale = 2 // pixel block size
      const w = Math.ceil(canvas.width / scale)
      const h = Math.ceil(canvas.height / scale)

      // Create image data for dithering
      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Time-based signal only (no spatial variation for uniform color)
          const signal =
            Math.sin(time * 0.8) +
            Math.sin(time * 0.5) +
            Math.sin(time * 1.2) * 0.5

          const normalized = (signal + 2.5) / 5 // normalize to ~0-1

          // Bayer dither threshold
          const threshold = bayer4[y % 4][x % 4] / 16
          const isDot = normalized > threshold

          // Color: green #2e8b6f or transparent
          const idx = (y * w + x) * 4
          if (isDot) {
            data[idx] = 46 // R
            data[idx + 1] = 139 // G
            data[idx + 2] = 111 // B
            data[idx + 3] = Math.round(255 * 0.12) // A - low opacity
          } else {
            data[idx] = 0
            data[idx + 1] = 0
            data[idx + 2] = 0
            data[idx + 3] = 0 // transparent
          }
        }
      }

      // Upscale via canvas rendering (pixelated effect)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = w
      tempCanvas.height = h
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height)
      }
    }

    // Emit a burst of 3 ripples with ASCII notes
    const scheduleBurst = (cx: number, cy: number) => {
      const maxR = Math.hypot(cx, cy) * 1.1
      const configs = [
        { delay: 0, opacity: 0.2, color: '27, 27, 27', strokeWidth: 2.5 }, // primary dark
        { delay: 400, opacity: 0.12, color: '46, 139, 111', strokeWidth: 2.5 }, // first echo (green)
        { delay: 800, opacity: 0.08, color: '27, 27, 27', strokeWidth: 2.5 }, // second echo dark
      ]

      configs.forEach(({ delay, opacity, color, strokeWidth }) => {
        setTimeout(() => {
          ripples.push({ radius: 0, maxRadius: maxR, opacity, color, strokeWidth })

          // Add ASCII notes around this ripple
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2
            asciiNotes.push({
              x: cx,
              y: cy,
              angle,
              opacity,
              distance: 0,
            })
          }
        }, delay)
      })
    }

    const draw = (timestamp: number) => {
      if (!canvas || !ctx) return

      time += 0.025

      const cx = canvas.width / 2
      const cy = canvas.height / 2

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw dithered background
      drawDitherField(time)

      // Draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const progress = r.radius / r.maxRadius
        const currentOpacity = r.opacity * (1 - progress)

        if (currentOpacity <= 0.002) {
          ripples.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(cx, cy, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r.color}, ${currentOpacity})`
        ctx.lineWidth = r.strokeWidth
        ctx.stroke()

        // Grow radius
        r.radius += 1.2 + progress * 0.8
      }

      // Draw ASCII notes
      for (let i = asciiNotes.length - 1; i >= 0; i--) {
        const note = asciiNotes[i]
        note.distance += 1.2 + (note.distance / 200) * 0.8

        const noteX = note.x + Math.cos(note.angle) * note.distance
        const noteY = note.y + Math.sin(note.angle) * note.distance

        const progress = note.distance / (Math.hypot(canvas.width / 2, canvas.height / 2) * 1.1)
        const currentOpacity = note.opacity * (1 - progress)

        if (currentOpacity <= 0.002) {
          asciiNotes.splice(i, 1)
          continue
        }

        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = `rgba(46, 139, 111, ${currentOpacity})`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('♪', noteX, noteY)
      }

      // Emit a burst every 2.5s
      if (timestamp - lastBurst > 2500) {
        scheduleBurst(cx, cy)
        lastBurst = timestamp
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none', imageRendering: 'pixelated' }}
    />
  )
}
