import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReactElement, RefObject } from 'react'
import * as ort from 'onnxruntime-web'
import type { DetectionResult, AIState } from '../types'

// ── ONNX WASM backend ────────────────────────────────────────────────────────
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/'

// ── COCO class names (80 classes, Turkish for relevant targets) ───────────────
const COCO_NAMES: string[] = [
  'İnsan',    // 0 person
  'Bisiklet', // 1 bicycle
  'Araç',     // 2 car
  'Motosiklet', // 3 motorcycle
  'Uçak',     // 4 airplane
  'Otobüs',   // 5 bus
  'Tren',     // 6 train
  'Kamyon',   // 7 truck
  'Tekne',    // 8 boat
  'Trafik Işığı', // 9
  'Yangın Musluğu', // 10
  'Dur Tabelası', // 11
  'Park Sayacı', // 12
  'Bench',    // 13
  'Kuş',      // 14
  'Kedi',     // 15
  'Köpek',    // 16
  'At',       // 17
  'Koyun',    // 18
  'İnek',     // 19
  'Fil',      // 20
  'Ayı',      // 21
  'Zebra',    // 22
  'Zürafa',   // 23
  'Sırt Çantası', // 24
  'Şemsiye',  // 25
  'Çanta',    // 26
  'Kravat',   // 27
  'Bavul',    // 28
  'Frizbi',   // 29
  'Kayak',    // 30
  'Snowboard', // 31
  'Top',      // 32
  'Uçurtma',  // 33
  'Beyzbol Sopası', // 34
  'Beyzbol Eldiveni', // 35
  'Kaykay',   // 36
  'Sörf Tahtası', // 37
  'Tenis Raketi', // 38
  'Şişe',     // 39
  'Şarap Kadehi', // 40
  'Fincan',   // 41
  'Çatal',    // 42
  'Bıçak',    // 43
  'Kaşık',    // 44
  'Kase',     // 45
  'Muz',      // 46
  'Elma',     // 47
  'Sandviç',  // 48
  'Portakal', // 49
  'Brokoli',  // 50
  'Havuç',    // 51
  'Sosis',    // 52
  'Pizza',    // 53
  'Çörek',    // 54
  'Pasta',    // 55
  'Sandalye', // 56
  'Kanepe',   // 57
  'Saksı',    // 58
  'Yatak',    // 59
  'Yemek Masası', // 60
  'Tuvalet',  // 61
  'TV',       // 62
  'Laptop',   // 63
  'Fare',     // 64
  'Uzaktan Kumanda', // 65
  'Klavye',   // 66
  'Cep Telefonu', // 67
  'Mikrodalga', // 68
  'Fırın',    // 69
  'Tost Makinesi', // 70
  'Lavabo',   // 71
  'Buzdolabı', // 72
  'Kitap',    // 73
  'Saat',     // 74
  'Vazo',     // 75
  'Makas',    // 76
  'Oyuncak Ayı', // 77
  'Saç Kurutma Makinesi', // 78
  'Diş Fırçası', // 79
]

// ── NMS helper ───────────────────────────────────────────────────────────────
function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = (a[2] - a[0]) * (a[3] - a[1])
  const areaB = (b[2] - b[0]) * (b[3] - b[1])
  return inter / (areaA + areaB - inter + 1e-6)
}

function nms(dets: DetectionResult[], iouThresh = 0.45): DetectionResult[] {
  const sorted = [...dets].sort((a, b) => b.confidence - a.confidence)
  const keep: DetectionResult[] = []
  const suppressed = new Set<number>()
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue
    keep.push(sorted[i])
    for (let j = i + 1; j < sorted.length; j++) {
      if (!suppressed.has(j) && sorted[i].classId === sorted[j].classId) {
        if (iou(sorted[i].bbox, sorted[j].bbox) > iouThresh) suppressed.add(j)
      }
    }
  }
  return keep
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CameraFeed(): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null) as RefObject<HTMLVideoElement>
  const canvasRef = useRef<HTMLCanvasElement>(null) as RefObject<HTMLCanvasElement>
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const sessionRef = useRef<ort.InferenceSession | null>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const frameCountRef = useRef(0)
  const lastFpsTime = useRef(performance.now())

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [ipUrl, setIpUrl] = useState('')
  const [useIp, setUseIp] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [aiState, setAiState] = useState<AIState>({
    running: false, fps: 0, modelLoaded: false, detections: [], inferenceMs: 0,
  })
  const [modelError, setModelError] = useState<string | null>(null)

  // ── enumerate cameras ────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const cams = devs.filter(d => d.kind === 'videoinput')
      setCameras(cams)
      if (cams.length > 0) setSelectedId(cams[0].deviceId)
    }).catch(() => {})
    return () => stopStream()
  }, [])

  // ── stream helpers ───────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStreaming(false)
    setAiState(s => ({ ...s, running: false, detections: [] }))
  }, [])

  const startStream = useCallback(async () => {
    stopStream()
    try {
      let stream: MediaStream
      if (useIp) {
        // IP camera: set video src to MJPEG URL directly
        if (videoRef.current) {
          videoRef.current.src = ipUrl
          videoRef.current.srcObject = null
        }
        setStreaming(true)
        return
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedId ? { exact: selectedId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.src = ''
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
      // request camera permissions for re-enumerate with labels
      navigator.mediaDevices.enumerateDevices().then(devs => {
        const cams = devs.filter(d => d.kind === 'videoinput')
        setCameras(cams)
      })
    } catch (err) {
      console.error('Camera error:', err)
    }
  }, [selectedId, useIp, ipUrl, stopStream])

  // ── ONNX model loader ────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    try {
      setModelError(null)
      const session = await ort.InferenceSession.create('/models/yolov8n.onnx', {
        executionProviders: ['wasm'],
      })
      sessionRef.current = session
      setAiState(s => ({ ...s, modelLoaded: true }))
      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement('canvas')
        offscreenRef.current.width = 640
        offscreenRef.current.height = 640
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setModelError(msg.includes('404') || msg.includes('fetch')
        ? 'yolov8n.onnx bulunamadı — public/models/ klasörüne yerleştirin'
        : msg)
      setAiState(s => ({ ...s, modelLoaded: false }))
    }
  }, [])

  // ── inference loop ───────────────────────────────────────────────────────
  const runInference = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const offscreen = offscreenRef.current
    const session = sessionRef.current

    if (!video || !canvas || !offscreen || !session || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runInference)
      return
    }

    // Match overlay canvas to video display size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Preprocess: draw frame → 640×640 offscreen
    const offCtx = offscreen.getContext('2d')!
    offCtx.drawImage(video, 0, 0, 640, 640)
    const imageData = offCtx.getImageData(0, 0, 640, 640)
    const { data } = imageData
    const float32 = new Float32Array(3 * 640 * 640)
    // NCHW + normalize [0,1]
    for (let i = 0; i < 640 * 640; i++) {
      float32[i]               = data[i * 4]     / 255  // R
      float32[640 * 640 + i]   = data[i * 4 + 1] / 255  // G
      float32[2 * 640 * 640 + i] = data[i * 4 + 2] / 255  // B
    }

    const t0 = performance.now()
    const inputTensor = new ort.Tensor('float32', float32, [1, 3, 640, 640])
    const inputName = session.inputNames[0]

    session.run({ [inputName]: inputTensor }).then(outputs => {
      const inferenceMs = performance.now() - t0
      const outputName = session.outputNames[0]
      const raw = outputs[outputName].data as Float32Array
      // raw shape: [1, 84, 8400]
      const numAnchors = 8400
      const numClasses = 80
      const vw = canvas.width, vh = canvas.height

      const detections: DetectionResult[] = []
      for (let a = 0; a < numAnchors; a++) {
        // row a: cx, cy, w, h, class0..79
        const cx = raw[0 * numAnchors + a]
        const cy = raw[1 * numAnchors + a]
        const w  = raw[2 * numAnchors + a]
        const h  = raw[3 * numAnchors + a]
        let maxScore = 0, classId = 0
        for (let c = 0; c < numClasses; c++) {
          const s = raw[(4 + c) * numAnchors + a]
          if (s > maxScore) { maxScore = s; classId = c }
        }
        if (maxScore < 0.35) continue
        // boxes in 640×640 → scale to video
        const x1 = ((cx - w / 2) / 640) * vw
        const y1 = ((cy - h / 2) / 640) * vh
        const x2 = ((cx + w / 2) / 640) * vw
        const y2 = ((cy + h / 2) / 640) * vh
        detections.push({
          classId, className: COCO_NAMES[classId] ?? `Sınıf${classId}`,
          confidence: maxScore, bbox: [x1, y1, x2, y2],
        })
      }
      const filtered = nms(detections)

      // Draw bboxes
      for (const det of filtered) {
        const [x1, y1, x2, y2] = det.bbox
        ctx.strokeStyle = '#00d4ff'
        ctx.lineWidth = 2
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        const label = `${det.className} ${(det.confidence * 100).toFixed(0)}%`
        ctx.font = 'bold 12px monospace'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(0,212,255,0.8)'
        ctx.fillRect(x1, y1 - 18, tw + 6, 18)
        ctx.fillStyle = '#050508'
        ctx.fillText(label, x1 + 3, y1 - 4)
      }

      // FPS calculation
      frameCountRef.current++
      const now = performance.now()
      const elapsed = now - lastFpsTime.current
      let fps = aiState.fps
      if (elapsed >= 1000) {
        fps = Math.round(frameCountRef.current * 1000 / elapsed)
        frameCountRef.current = 0
        lastFpsTime.current = now
      }

      setAiState(s => ({ ...s, fps, inferenceMs: Math.round(inferenceMs), detections: filtered }))
      rafRef.current = requestAnimationFrame(runInference)
    }).catch(() => {
      rafRef.current = requestAnimationFrame(runInference)
    })
  }, [aiState.fps])

  const toggleAI = useCallback(() => {
    if (aiState.running) {
      cancelAnimationFrame(rafRef.current)
      setAiState(s => ({ ...s, running: false, detections: [], fps: 0 }))
    } else {
      if (!sessionRef.current) { loadModel().then(() => {}); return }
      setAiState(s => ({ ...s, running: true }))
      rafRef.current = requestAnimationFrame(runInference)
    }
  }, [aiState.running, loadModel, runInference])

  // Start inference when model loads AND ai was requested
  useEffect(() => {
    if (aiState.modelLoaded && aiState.running) {
      rafRef.current = requestAnimationFrame(runInference)
    }
  }, [aiState.modelLoaded, aiState.running, runInference])

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', padding: 10 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#8a9bb0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={useIp} onChange={e => setUseIp(e.target.checked)} />
          IP Kamera
        </label>
        {useIp ? (
          <input
            value={ipUrl}
            onChange={e => setIpUrl(e.target.value)}
            placeholder="http://192.168.1.100:8080/video"
            style={{ flex: 1, background: '#1a2332', color: '#c5d3e0', border: '1px solid #2d3f55', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontFamily: 'monospace' }}
          />
        ) : (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ flex: 1, background: '#1a2332', color: '#c5d3e0', border: '1px solid #2d3f55', borderRadius: 4, padding: '4px 8px', fontSize: 12 }}
          >
            {cameras.length === 0 && <option value="">Kamera bulunamadı</option>}
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Kamera ${cameras.indexOf(c) + 1}`}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={streaming ? stopStream : startStream}
          style={{ background: streaming ? '#ff4d00' : '#00ff88', color: '#050508', border: 'none', borderRadius: 4, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {streaming ? 'DURDUR' : 'BAŞLAT'}
        </button>
      </div>

      {/* Video + Canvas overlay */}
      <div style={{ position: 'relative', background: '#0a1628', borderRadius: 6, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        {!streaming && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a70', fontSize: 14, letterSpacing: 2 }}>
            KAMERA BEKLENİYOR
          </div>
        )}
      </div>

      {/* AI Panel */}
      <div style={{ background: '#0f1c2e', border: '1px solid #1a2d45', borderRadius: 6, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: '#00d4ff', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>AI HEDEF TANIMA</span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: aiState.modelLoaded ? 'rgba(0,255,136,0.15)' : 'rgba(255,77,0,0.15)',
            color: aiState.modelLoaded ? '#00ff88' : '#ff4d00',
          }}>
            {aiState.modelLoaded ? 'YOLO v8n HAZIR' : 'MODEL BEKLENİYOR'}
          </span>
          {aiState.running && (
            <>
              <span style={{ fontSize: 10, color: '#8a9bb0' }}>{aiState.fps} FPS</span>
              <span style={{ fontSize: 10, color: '#8a9bb0' }}>{aiState.inferenceMs}ms</span>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {!aiState.modelLoaded && (
              <button
                onClick={loadModel}
                style={{ background: '#1a2d45', color: '#00d4ff', border: '1px solid #2d4060', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                MODEL YÜKLEa
              </button>
            )}
            <button
              onClick={toggleAI}
              disabled={!streaming}
              style={{
                background: aiState.running ? 'rgba(255,77,0,0.2)' : 'rgba(0,212,255,0.15)',
                color: aiState.running ? '#ff4d00' : '#00d4ff',
                border: `1px solid ${aiState.running ? '#ff4d00' : '#00d4ff'}`,
                borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: streaming ? 'pointer' : 'not-allowed', opacity: streaming ? 1 : 0.4,
              }}
            >
              {aiState.running ? 'DURDUR' : 'BAŞLAT'}
            </button>
          </div>
        </div>
        {modelError && (
          <div style={{ fontSize: 10, color: '#ff4d00', marginBottom: 6, background: 'rgba(255,77,0,0.08)', padding: '4px 8px', borderRadius: 4 }}>
            {modelError}
            <div style={{ marginTop: 4, color: '#8a9bb0' }}>
              İndir: <a href="https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx" target="_blank" rel="noreferrer" style={{ color: '#00d4ff' }}>yolov8n.onnx</a>
              {' '}→ <code style={{ background: '#1a2d45', padding: '0 4px', borderRadius: 2 }}>gcs/public/models/</code>
            </div>
          </div>
        )}
        {/* Detection list */}
        <div style={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {aiState.detections.length === 0 && aiState.running && (
            <span style={{ color: '#4a5a70', fontSize: 11 }}>Hedef tespit edilmedi</span>
          )}
          {aiState.detections.map((d, i) => (
            <span key={i} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 3,
              background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)',
            }}>
              {d.className} {(d.confidence * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
