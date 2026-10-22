/**
 * live_socket_upstash.scratch.js
 *
 * Real live multi-instance Socket.IO verification against Upstash Redis.
 *
 * Test matrix:
 * 1. Two separate HTTP/Socket.io servers (Server A & Server B) with Upstash Redis adapters.
 * 2. Client 1 connects to Server A; Client 2 connects to Server B.
 * 3. Client 1 and Client 2 join room "college:live_test".
 * 4. Server A broadcasts to "college:live_test" — Client 2 on Server B must receive it across instances.
 * 5. Server A broadcasts to "college:other_room" — neither client should receive it (room isolation).
 * 6. Verify exactly 1 delivery to Client 2 (no duplicates).
 * 7. Clean up all clients, servers, and Redis connections cleanly.
 */

import 'dotenv/config'
import http from 'node:http'
import { Server } from 'socket.io'
import { io as Client } from 'socket.io-client'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { normalizeRedisUrl, redactedUrl } from '../src/services/redis.service.js'

async function runLiveSocketTest() {
  console.log('=================================================================')
  console.log(' LIVE MULTI-INSTANCE SOCKET.IO UPSTASH ADAPTER VERIFICATION')
  console.log('=================================================================\n')

  const rawUrl = process.env.REDIS_URL
  const cleanUrl = normalizeRedisUrl(rawUrl)

  if (!cleanUrl) {
    console.error('[ERROR] REDIS_URL not configured. Cannot run live Upstash test.')
    process.exit(1)
  }

  console.log(`Target: ${redactedUrl(cleanUrl)}`)
  console.log('Setting up dual Socket.IO instances with dedicated Upstash pub/sub clients...\n')

  // Upstash connection helper
  function makeClient(label) {
    const client = new Redis(cleanUrl, {
      connectTimeout: 5000,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    })
    client.on('error', (err) => console.error(`[${label}] Error: ${err.message}`))
    return client
  }

  const pubA = makeClient('pubA')
  const subA = makeClient('subA')
  const pubB = makeClient('pubB')
  const subB = makeClient('subB')

  // Wait for all 4 clients to be ready
  await Promise.all([
    new Promise(r => pubA.once('ready', r)),
    new Promise(r => subA.once('ready', r)),
    new Promise(r => pubB.once('ready', r)),
    new Promise(r => subB.once('ready', r)),
  ])
  console.log('✔ All 4 Upstash pub/sub clients connected and ready.')

  // Create Server A on ephemeral port
  const httpA = http.createServer()
  const ioA = new Server(httpA, {
    adapter: createAdapter(pubA, subA),
    cors: { origin: '*' },
  })

  // Create Server B on ephemeral port
  const httpB = http.createServer()
  const ioB = new Server(httpB, {
    adapter: createAdapter(pubB, subB),
    cors: { origin: '*' },
  })

  // Listen on random free ports
  await new Promise(r => httpA.listen(0, '127.0.0.1', r))
  await new Promise(r => httpB.listen(0, '127.0.0.1', r))

  const portA = httpA.address().port
  const portB = httpB.address().port
  console.log(`✔ Server A listening on port ${portA}`)
  console.log(`✔ Server B listening on port ${portB}`)

  // Setup server socket join logic
  const TEST_ROOM = `college:live_test_${Date.now()}`
  const ISOLATED_ROOM = `college:isolated_${Date.now()}`

  ioA.on('connection', (socket) => {
    socket.on('join-room', (room, ack) => {
      socket.join(room)
      if (typeof ack === 'function') ack({ joined: true, room })
    })
  })

  ioB.on('connection', (socket) => {
    socket.on('join-room', (room, ack) => {
      socket.join(room)
      if (typeof ack === 'function') ack({ joined: true, room })
    })
  })

  // Connect Client 1 -> Server A
  const client1 = Client(`http://127.0.0.1:${portA}`, { reconnection: false, transports: ['websocket'] })
  // Connect Client 2 -> Server B
  const client2 = Client(`http://127.0.0.1:${portB}`, { reconnection: false, transports: ['websocket'] })

  await Promise.all([
    new Promise(r => client1.on('connect', r)),
    new Promise(r => client2.on('connect', r)),
  ])
  console.log('✔ Client 1 connected to Server A')
  console.log('✔ Client 2 connected to Server B')

  // Both clients join the test room
  await Promise.all([
    new Promise(r => client1.emit('join-room', TEST_ROOM, r)),
    new Promise(r => client2.emit('join-room', TEST_ROOM, r)),
  ])
  console.log(`✔ Both clients joined room: ${TEST_ROOM}`)

  // Small delay for Redis adapter sub subscription registration
  await new Promise(r => setTimeout(r, 500))

  // Track received events on Client 2
  const receivedOnClient2 = []
  const receivedOnClient1 = []

  client1.on('notice:created', (data) => receivedOnClient1.push(data))
  client2.on('notice:created', (data) => receivedOnClient2.push(data))

  // Test 1: Cross-instance broadcast
  console.log('\n--- Test 1: Cross-Instance Broadcast ---')
  const payload1 = { id: 'msg-1', title: 'Cross-Instance Live Notice', timestamp: Date.now() }
  ioA.to(TEST_ROOM).emit('notice:created', payload1)

  // Wait 1.5s for delivery across Upstash
  await new Promise(r => setTimeout(r, 1500))

  const deliveredToClient2 = receivedOnClient2.length === 1 && receivedOnClient2[0].id === 'msg-1'
  const deliveredToClient1 = receivedOnClient1.length === 1 && receivedOnClient1[0].id === 'msg-1'
  console.log(`   - Client 1 (on Server A) received: ${deliveredToClient1} (count: ${receivedOnClient1.length})`)
  console.log(`   - Client 2 (on Server B) received: ${deliveredToClient2} (count: ${receivedOnClient2.length})`)

  if (!deliveredToClient2) {
    throw new Error('Cross-instance delivery failed: Client 2 on Server B did not receive event from Server A')
  }

  // Test 2: Room isolation
  console.log('\n--- Test 2: Room Isolation ---')
  const payload2 = { id: 'msg-isolated', title: 'Should NOT be received' }
  ioA.to(ISOLATED_ROOM).emit('notice:created', payload2)
  await new Promise(r => setTimeout(r, 1000))

  const isolationMaintained = receivedOnClient2.length === 1 && receivedOnClient1.length === 1
  console.log(`   - No events leaked from isolated room: ${isolationMaintained}`)
  if (!isolationMaintained) {
    throw new Error('Room isolation failed: unjoined client received event')
  }

  // Test 3: No duplicate delivery
  console.log('\n--- Test 3: Duplicate Delivery Check ---')
  console.log(`   - Exactly 1 event received by Client 2: ${receivedOnClient2.length === 1}`)

  // Cleanup
  console.log('\n--- Cleaning up resources ---')
  client1.disconnect()
  client2.disconnect()
  await new Promise(r => ioA.close(r))
  await new Promise(r => ioB.close(r))
  await Promise.all([
    pubA.quit(),
    subA.quit(),
    pubB.quit(),
    subB.quit(),
  ])
  console.log('✔ All clients, servers, and Upstash connections cleanly closed.')

  console.log('\n=================================================================')
  console.log(' ALL LIVE UPSTASH SOCKET.IO TESTS PASSED')
  console.log('=================================================================')
}

runLiveSocketTest().catch(err => {
  console.error('\n[FATAL ERROR in live socket test]:', err)
  process.exit(1)
})
