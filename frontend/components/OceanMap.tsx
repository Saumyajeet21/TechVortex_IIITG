'use client'
import { useEffect, useRef } from 'react'
import { Zone, getRiskColor } from '@/lib/zones'
import { useRouter } from 'next/navigation'

interface Props {
  zones: Zone[]
  selectedZoneId?: string | null
}

export default function OceanMap({ zones, selectedZoneId }: Props) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return
    if (mapRef.current) return // already initialized

    // Dynamically import Leaflet (SSR-safe)
    import('leaflet').then(L => {
      const map = L.map(containerRef.current!, {
        center: [15.5, 80.5],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        opacity: 0.6,
      }).addTo(map)

      // Subtle dark ocean overlay
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect fill='rgba(2,6,23,0.4)' width='256' height='256'/></svg>`
      const url = `data:image/svg+xml;base64,${btoa(svg)}`
      L.imageOverlay(url, [[-90, -180], [90, 180]], { opacity: 0.3 }).addTo(map)

      zones.forEach(zone => {
        const color = getRiskColor(zone.risk)
        const radius = 20 + zone.risk * 35

        const circle = L.circleMarker([zone.lat, zone.lon], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.35,
        }).addTo(map)

        // Pulsing outer ring
        const ring = L.circleMarker([zone.lat, zone.lon], {
          radius: radius + 8,
          fillColor: 'transparent',
          color: color,
          weight: 1,
          opacity: 0.4,
          fillOpacity: 0,
        }).addTo(map)

        const dmg = zone.damage_usd >= 1000
          ? `$${(zone.damage_usd / 1000).toFixed(1)}K`
          : `$${zone.damage_usd}`

        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:14px;color:#38bdf8;margin-bottom:6px">${zone.name}</div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">${zone.region}</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="color:#94a3b8;font-size:11px">Plastic Risk</span>
              <span style="color:${color};font-weight:600;font-size:12px">${(zone.risk * 100).toFixed(0)}% ${zone.risk_label}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:#94a3b8;font-size:11px">Monthly Loss</span>
              <span style="color:#f59e0b;font-weight:600;font-size:12px">${dmg}</span>
            </div>
            <button onclick="window.location.href='/zones/${zone.id}'"
              style="width:100%;padding:6px;background:rgba(14,165,233,0.2);border:1px solid rgba(14,165,233,0.4);
                color:#38bdf8;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500">
              View Details →
            </button>
          </div>
        `, { maxWidth: 220 })

        circle.on('click', () => {
          router.push(`/zones/${zone.id}`)
        })
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Highlight selected zone
  useEffect(() => {
    if (selectedZoneId && mapRef.current) {
      const zone = zones.find(z => z.id === selectedZoneId)
      if (zone) {
        mapRef.current.flyTo([zone.lat, zone.lon], 8, { duration: 1.5 })
      }
    }
  }, [selectedZoneId])

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl"
      style={{ minHeight: '420px' }}
    />
  )
}
