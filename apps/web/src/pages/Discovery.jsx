// Discovery.jsx — stub, replaced in Phase 1 Day 12
import { useRoomStore } from '../stores/roomStore.js'
export default function Discovery() {
  const { setActiveRoom } = useRoomStore()
  return null  // RightPanel reads activeRoom from store and renders DiscoveryFeed
}
