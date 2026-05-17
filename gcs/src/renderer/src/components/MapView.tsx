import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { WaypointItem } from '../types'

const DRONE_SVG = (heading: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g transform="rotate(${heading}, 16, 16)">
    <polygon points="16,4 20,28 16,24 12,28" fill="#00d4ff" stroke="#050508" stroke-width="1"/>
    <circle cx="16" cy="16" r="3" fill="#050508" stroke="#00d4ff" stroke-width="1.5"/>
  </g>
</svg>`

function droneIcon(heading: number) {
  return L.divIcon({
    html: DRONE_SVG(heading),
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function waypointIcon(seq: number) {
  return L.divIcon({
    html: `<div style="background:#ff4d00;color:#fff;font-family:monospace;font-size:9px;font-weight:bold;
      width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 0 6px rgba(255,77,0,0.8)">${seq}</div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

interface MapViewProps {
  lat: number
  lng: number
  heading: number
  waypoints: WaypointItem[]
  onMapClick: (lat: number, lng: number) => void
}

export default function MapView({ lat, lng, heading, waypoints, onMapClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const droneRef = useRef<L.Marker | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const trailPoints = useRef<L.LatLng[]>([])
  const wpLayerRef = useRef<L.LayerGroup | null>(null)
  const wpLineRef = useRef<L.Polyline | null>(null)
  const followRef = useRef(true)

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat || 39.9334, lng || 32.8597],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    // Dark CartoDB tile
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Drone marker
    droneRef.current = L.marker([lat || 39.9334, lng || 32.8597], {
      icon: droneIcon(heading),
      zIndexOffset: 1000,
    }).addTo(map)

    // Trail
    trailRef.current = L.polyline([], {
      color: '#00d4ff',
      weight: 1.5,
      opacity: 0.6,
      dashArray: '4 4',
    }).addTo(map)

    // Waypoint layer
    wpLayerRef.current = L.layerGroup().addTo(map)
    wpLineRef.current = L.polyline([], { color: '#ff4d00', weight: 1.5, dashArray: '6 4', opacity: 0.7 }).addTo(map)

    // Click to add waypoint
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    })

    // Disable follow on drag
    map.on('dragstart', () => { followRef.current = false })

    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update drone position
  useEffect(() => {
    if (!mapRef.current || !droneRef.current) return
    if (lat === 0 && lng === 0) return
    const pos = L.latLng(lat, lng)
    droneRef.current.setLatLng(pos)
    droneRef.current.setIcon(droneIcon(heading))

    trailPoints.current.push(pos)
    if (trailPoints.current.length > 2000) trailPoints.current.shift()
    trailRef.current?.setLatLngs(trailPoints.current)

    if (followRef.current) mapRef.current.panTo(pos, { animate: true, duration: 0.5 })
  }, [lat, lng, heading])

  // Update waypoints
  useEffect(() => {
    if (!wpLayerRef.current || !wpLineRef.current) return
    wpLayerRef.current.clearLayers()
    const coords: L.LatLng[] = []
    waypoints.forEach(wp => {
      const pos = L.latLng(wp.lat, wp.lng)
      coords.push(pos)
      L.marker(pos, { icon: waypointIcon(wp.seq + 1) })
        .bindTooltip(`WP-${wp.seq + 1} | ${wp.alt}m`, { permanent: false, direction: 'top' })
        .addTo(wpLayerRef.current!)
    })
    wpLineRef.current.setLatLngs(coords)
  }, [waypoints])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      onClick={() => { followRef.current = true }}
    />
  )
}
