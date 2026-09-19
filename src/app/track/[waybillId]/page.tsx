'use client'

import { use } from 'react'
import TrackContent from '@/components/TrackContent'

export default function TrackWaybillPage({
  params,
}: {
  params: Promise<{ waybillId: string }>
}) {
  const resolvedParams = use(params)
  let waybillId = resolvedParams.waybillId || ''
  try {
    waybillId = decodeURIComponent(resolvedParams.waybillId)
  } catch {
    // Keep raw string fallback if URI malformed
  }

  return <TrackContent initialWaybillId={waybillId.trim()} />
}
