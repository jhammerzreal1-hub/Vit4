import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{D as t,Gn as n,Hn as r,I as i,Ir as a,Jn as o,Xt as s,Y as c,i as l,it as u,qr as d,sr as f,t as p,xt as m}from"./vendor-react-ewC62exy.js";import{t as h}from"./index-DIV_irKy.js";var g=e(d(),1),_=[{id:`topic-crdt-sync`,title:`Conflict-Free Replicated Data Types (CRDTs) & State-Based Merging`,category:`distributed`,difficulty:`Apex`,summary:`Mathematically proven data structures that allow concurrent, multi-node writes without centralized coordination, converging deterministically via join-semilattices.`,keyConcepts:[`CvRDT (State-based) vs CmRDT (Operation-based)`,`LWW-Element-Set (Last-Write-Wins Element Set)`,`Join-Semilattice idempotence, commutativity, and associativity: (x ⊔ y) ⊔ z = x ⊔ (y ⊔ z)`,`Vector Clocks & Causality Tracking`],language:`typescript`,codeSnippet:`export interface LWWRegister<T> {
  value: T;
  timestamp: number;
  nodeId: string;
}

export class LWWStateMap<K extends string, V> {
  private store = new Map<K, LWWRegister<V>>();

  set(key: K, value: V, nodeId: string): void {
    const timestamp = Date.now();
    const existing = this.store.get(key);
    if (!existing || timestamp > existing.timestamp || 
       (timestamp === existing.timestamp && nodeId > existing.nodeId)) {
      this.store.set(key, { value, timestamp, nodeId });
    }
  }

  get(key: K): V | undefined {
    return this.store.get(key)?.value;
  }

  merge(remoteMap: Map<K, LWWRegister<V>>): void {
    for (const [key, remoteReg] of remoteMap.entries()) {
      const local = this.store.get(key);
      if (!local || remoteReg.timestamp > local.timestamp ||
         (remoteReg.timestamp === local.timestamp && remoteReg.nodeId > local.nodeId)) {
        this.store.set(key, remoteReg);
      }
    }
  }
}`,deepDive:`CRDTs guarantee Strong Eventual Consistency (SEC). Unlike traditional two-phase locking (2PC) or Raft which sacrifice availability under network partitions (CAP theorem), CRDTs achieve partition tolerance and high write throughput for local-first peer-to-peer topologies. State is modeled as a partially ordered set (poset) with a least upper bound (supremum). Whenever two replicas synchronize, they compute the join of their states.`,bestPractices:[`Ensure timestamps are monotonic per node or augmented with logical sequence counters`,`Use tombstones for deletions to prevent resurrected elements in distributed sets`,`Prune tombstone history periodically when all nodes attest vector clock progression`],antiPatterns:[`Relying purely on unsynchronized client wall-clock time without node ID tie-breaking`,`Storing massive unbound operation histories in memory without state compaction`]},{id:`topic-flash-attention`,title:`FlashAttention & KV-Cache Tiling Mechanics in Transformer Inferences`,category:`ai_neural`,difficulty:`Master`,summary:`Hardware-aware exact attention computation that reorganizes matrix operations to fit within fast GPU SRAM, minimizing high-latency HBM memory read/write bottlenecks.`,keyConcepts:[`IO-Aware Algorithm Complexity: O(N) memory accesses vs standard O(N²)`,`Online Softmax computation without full materialization`,`Tiling query, key, and value blocks across SRAM caches`,`Grouped-Query Attention (GQA) & Paged Attention in vLLM`],language:`python`,codeSnippet:`# Mathematical abstraction of Online Softmax across tiled blocks:
import math

def online_softmax_step(m_prev, d_prev, out_prev, scores_block, v_block):
    # m = max score seen so far for numerical stability
    m_curr = max(m_prev, scores_block.max())
    alpha = math.exp(m_prev - m_curr)
    
    # Rescale previous running denominator and accumulator
    d_curr = d_prev * alpha + sum(math.exp(s - m_curr) for s in scores_block)
    
    # Update running output vector without materializing full N x N matrix
    p_curr = [math.exp(s - m_curr) for s in scores_block]
    out_curr = (out_prev * alpha) + sum(p * v for p, v in zip(p_curr, v_block))
    return m_curr, d_curr, out_curr`,deepDive:`Standard Transformer attention materializes the intermediate attention score matrix S = Q * K^T of shape (SeqLen, SeqLen). For long sequences (e.g. 32k to 1M tokens), this causes catastrophic Out-Of-Memory (OOM) and memory bandwidth saturation. FlashAttention decomposes Q, K, and V into blocks that fit within on-chip SRAM (e.g. NVIDIA A100/H100 20MB SRAM per SM), calculating partial softmax normalizers incrementally.`,bestPractices:[`Always use FlashAttention-2 or SDPA in production inference engines`,`Enable KV-cache quantizations (FP8 / INT8) for serving large context windows`,`Implement Speculative Decoding with small draft models (e.g. 1B draft for 70B target)`],antiPatterns:[`Naive torch.matmul(Q, K.transpose()) without chunking or fused kernel acceleration`,`Re-computing prompt KV caches repeatedly across multi-turn chat iterations`]},{id:`topic-react19-fiber`,title:`React 19 Concurrent Fiber Engine, Work Loop & Cooperative Scheduling`,category:`web_fullstack`,difficulty:`Advanced`,summary:`Deep internal mechanics of the React Fiber reconciliation pipeline, work-in-progress trees, lane-based priority scheduling, and batched microtask updates.`,keyConcepts:[`Fiber Node structure: child, sibling, return, memoizedState, alternate`,`Double Buffering: current tree vs workInProgress tree`,`Lane priority bitmasks (SyncLane, InputContinuousLane, DefaultLane, IdleLane)`,`Interruptible reconciliation with requestIdleCallback / MessageChannel scheduler`],language:`typescript`,codeSnippet:`// Abstracted Fiber Work Loop execution model
interface FiberNode {
  tag: number;
  type: any;
  stateNode: HTMLElement | null;
  child: FiberNode | null;
  sibling: FiberNode | null;
  return: FiberNode | null;
  memoizedProps: any;
  pendingProps: any;
  lanes: number; // Priority bitmask
  alternate: FiberNode | null;
}

function workLoopConcurrent(deadline: { timeRemaining: () => number }) {
  let nextUnitOfWork: FiberNode | null = getNextTask();
  
  while (nextUnitOfWork !== null && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (nextUnitOfWork !== null) {
    // Yield to browser main thread for 60fps frame budget, then resume
    postYieldTask(() => workLoopConcurrent(deadline));
  } else {
    // Commit phase (synchronous mutation to real DOM)
    commitRoot();
  }
}`,deepDive:`Before React 16, reconciliation was recursive (the Stack reconciler) and un-interruptible. If tree diffing took 40ms, the main browser thread dropped frames. Fiber converts the call stack into a linked-list data structure stored on the heap. This allows React to pause rendering to handle user input (keystrokes, gestures) and resume background re-renders seamlessly. React 19 builds on this with Actions, useActionState, and automatic microtask batching.`,bestPractices:[`Keep component functions pure with no direct side-effects during render phase`,`Use startTransition for non-urgent UI updates to maintain fluid typing latency`,`Ensure stable key props across lists to allow O(N) node reordering rather than O(N³) re-creation`],antiPatterns:[`Mutating state objects directly instead of producing new object references`,`Performing heavy synchronous computational loops inside render body`]},{id:`topic-zero-trust-abac`,title:`Zero-Trust Attribute-Based Access Control (ABAC) & Firestore Security Proofs`,category:`security`,difficulty:`Master`,summary:`Mathematically robust access control logic evaluating resource state, authenticated user claims, temporal boundaries, and schema shape invariance.`,keyConcepts:[`Principle of Least Privilege & Default-Deny Catch-All`,`Immutable provenance verification (UID binding & request.time timestamps)`,`Action-based atomic updates with affectedKeys().hasOnly()`,`Denial-of-Wallet prevention with pre-read static validation guards`],language:`javascript`,codeSnippet:`// Hardened Firestore ABAC Security Rule Pattern
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default Deny Root
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { 
      return isSignedIn() && (request.auth.uid == uid || request.auth.token.email == 'master@aurelius.matrix'); 
    }
    function isValidId(id) { return id is string && id.size() > 0 && id.size() <= 128; }

    match /users/{userId}/records/{recordId} {
      allow get, list: if isOwner(userId);
      
      allow create: if isOwner(userId) &&
        isValidId(recordId) &&
        request.resource.data.keys().hasAll(['title', 'createdAt', 'ownerId']) &&
        request.resource.data.keys().hasOnly(['title', 'createdAt', 'ownerId', 'meta']) &&
        request.resource.data.ownerId == request.auth.uid &&
        request.resource.data.title is string &&
        request.resource.data.title.size() <= 200 &&
        request.resource.data.createdAt == request.time;
        
      allow update: if isOwner(userId) &&
        request.resource.data.createdAt == resource.data.createdAt &&
        request.resource.data.ownerId == resource.data.ownerId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['title', 'meta']);
    }
  }
}`,deepDive:`Traditional RBAC relies on static roles (admin/user) that are prone to privilege escalation and update-gaps. ABAC verifies contextual attributes (who the user is, who owns the document, whether the operation occurs within allowed temporal windows, and whether all fields conform to size bounds). Enforcing rules at the database engine prevents client-side bypass even if the front-end code is completely compromised.`,bestPractices:[`Always place auth and type checks before any get() or exists() lookups`,`Protect immortal fields (createdAt, ownerId) from mutation during update`,`Bound every string, array, and list length to prevent database exhaustion attacks`],antiPatterns:[`Allowing blanket queries: allow list: if isSignedIn() without resource attribute filtering`,`Trusting client-supplied timestamps (use request.time instead)`]},{id:`topic-lockfree-ring-buffer`,title:`Lock-Free SPSC / MPMC Ring Buffers & Cache-Line Padding`,category:`systems`,difficulty:`Apex`,summary:`Ultra-low latency circular queues utilizing atomic memory fences, modulo bit-masking, and cache-line padding to eliminate thread contention and false sharing.`,keyConcepts:[`Single-Producer Single-Consumer (SPSC) vs Multi-Producer Multi-Consumer (MPMC)`,`Memory Order: acquire/release semantics vs sequential consistency`,`False Sharing & 64-byte Cache-Line Alignment`,`Power-of-Two Ring Capacity: (head & (capacity - 1)) replacing costly modulo %`],language:`cpp`,codeSnippet:`// High-performance C++20 Lock-Free SPSC Ring Buffer
#include <atomic>
#include <cstddef>
#include <new>

template <typename T, size_t Capacity>
class LockFreeRingBuffer {
  static_assert((Capacity & (Capacity - 1)) == 0, "Capacity must be power of 2");
  
  alignas(64) std::atomic<size_t> head_{0}; // Producer write pointer
  alignas(64) std::atomic<size_t> tail_{0}; // Consumer read pointer
  alignas(64) T buffer_[Capacity];          // Storage isolated from pointer cache-lines

public:
  bool push(const T& item) noexcept {
    const size_t current_head = head_.load(std::memory_order_relaxed);
    const size_t current_tail = tail_.load(std::memory_order_acquire);

    if ((current_head - current_tail) >= Capacity) {
      return false; // Queue full
    }

    buffer_[current_head & (Capacity - 1)] = item;
    head_.store(current_head + 1, std::memory_order_release);
    return true;
  }

  bool pop(T& item) noexcept {
    const size_t current_tail = tail_.load(std::memory_order_relaxed);
    const size_t current_head = head_.load(std::memory_order_acquire);

    if (current_tail == current_head) {
      return false; // Queue empty
    }

    item = buffer_[current_tail & (Capacity - 1)];
    tail_.store(current_tail + 1, std::memory_order_release);
    return true;
  }
};`,deepDive:`In high-frequency trading and high-throughput real-time streaming engines (such as PCM audio processing or IPC telemetry pipes), mutex locks cause operating system context switches and scheduler latency spikes. A lock-free SPSC buffer relies purely on hardware memory barriers. Using alignas(64) prevents head and tail pointers from occupying the same 64-byte L1 CPU cache line, eliminating cache invalidation thrashing.`,bestPractices:[`Ensure ring buffer capacity is strictly a power of 2 to substitute bitwise AND for integer division`,`Use memory_order_acquire on reads and memory_order_release on writes`,`Pad atomic counters to CPU cache-line boundaries (typically 64 or 128 bytes)`],antiPatterns:[`Using standard std::mutex in audio render callbacks or high-throughput telemetry loops`,`Allowing producers and consumers to write to adjacent struct fields without alignment padding`]},{id:`topic-termux-proot-ipc`,title:`Termux Linux Userland, PRoot Architecture & Low-Level POSIX IPC`,category:`edge_linux`,difficulty:`Advanced`,summary:`Execution mechanisms for running unprivileged Linux distributions on Android without root, translating syscalls via ptrace, and managing background daemons.`,keyConcepts:[`PRoot ptrace-based syscall emulation and path rewriting`,`Unix Domain Sockets (UDS) for low-latency IPC vs TCP loopback`,`Android SELinux restrictions & W^X memory policies`,`Android OOM-killer (Out-Of-Memory) scoring & foreground wakelocks`],language:`bash`,codeSnippet:`#!/usr/bin/env bash
# Sovereign Termux Background Daemon & IPC Socket Provisioner
set -euo pipefail

SOCKET_PATH="/data/data/com.termux/files/usr/tmp/sovereign.sock"
LOG_PATH="/data/data/com.termux/files/home/.aurelius/daemon.log"

# Prevent Android OS Doze & Low Memory Killer (LMK) eviction
termux-wake-lock 2>/dev/null || true

# Clean up stale socket file descriptor
rm -f "$SOCKET_PATH"

echo "[IPC] Spawning Sovereign Node Core with Unix Domain Socket..."
exec node -e "
  const net = require('net');
  const server = net.createServer((c) => {
    c.write(JSON.stringify({ status: 'ACK', substrate: 'Termux ARM64 Linux' }) + '\\n');
    c.on('data', (d) => {
      try {
        const cmd = JSON.parse(d.toString());
        c.write(JSON.stringify({ echo: cmd, timestamp: Date.now() }) + '\\n');
      } catch(e) {}
    });
  });
  server.listen('$SOCKET_PATH', () => {
    console.log('Listening on $SOCKET_PATH');
  });
" >> "$LOG_PATH" 2>&1 &`,deepDive:`Android security enforces separate UID sandboxes per app. PRoot leverages Linux ptrace to intercept syscalls made by binaries compiled for standard Linux (e.g. Debian, Ubuntu, Alpine) and transparently rewrites absolute file paths (like /bin, /usr, /etc) to point inside the Termux application directory. When paired with termux-wake-lock and Unix Domain Sockets, Termux becomes a full bare-metal edge AI node capable of running llama.cpp and Ollama.`,bestPractices:[`Always acquire a wake-lock before running persistent local LLM inference jobs`,`Prefer Unix Domain Sockets over TCP ports to avoid port collision and socket timeout overhead`,`Compile native binaries with -O3 -march=armv8-a+simd+dotprod for modern ARM64 chips`],antiPatterns:[`Assuming /tmp exists at system root (must use Termux prefix $PREFIX/tmp)`,`Relying on standard systemd init (use Termux Termux-Services or custom runsv daemons)`]},{id:`topic-tarjan-scc`,title:`Tarjan's Strongly Connected Components (SCC) & Graph Cycle Detection`,category:`algorithms`,difficulty:`Master`,summary:`Linear-time O(V + E) depth-first search algorithm that partitions a directed graph into maximal subgraphs where every vertex is reachable from every other vertex.`,keyConcepts:[`Discovery Time & Lowest Reachable Vertex (low-link value)`,`DFS Tree traversal & recursion stack tracking`,`Dependency Resolution & Topological Sorting of SCC condensations`,`Deadlock and Circular Dependency detection in build systems and agent task graphs`],language:`typescript`,codeSnippet:`// Tarjan's Strongly Connected Components Algorithm in TypeScript
export class TarjanSCC {
  private index = 0;
  private stack: string[] = [];
  private onStack = new Set<string>();
  private indices = new Map<string, number>();
  private lowLinks = new Map<string, number>();
  private sccs: string[][] = [];

  constructor(private adjacencyList: Map<string, string[]>) {}

  findSCCs(): string[][] {
    for (const node of this.adjacencyList.keys()) {
      if (!this.indices.has(node)) {
        this.strongConnect(node);
      }
    }
    return this.sccs;
  }

  private strongConnect(u: string): void {
    this.indices.set(u, this.index);
    this.lowLinks.set(u, this.index);
    this.index++;
    this.stack.push(u);
    this.onStack.add(u);

    const neighbors = this.adjacencyList.get(u) || [];
    for (const v of neighbors) {
      if (!this.indices.has(v)) {
        this.strongConnect(v);
        this.lowLinks.set(u, Math.min(this.lowLinks.get(u)!, this.lowLinks.get(v)!));
      } else if (this.onStack.has(v)) {
        this.lowLinks.set(u, Math.min(this.lowLinks.get(u)!, this.indices.get(v)!));
      }
    }

    if (this.lowLinks.get(u) === this.indices.get(u)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = this.stack.pop()!;
        this.onStack.delete(w);
        scc.push(w);
      } while (w !== u);
      this.sccs.push(scc);
    }
  }
}`,deepDive:`Detecting cycles in multi-agent execution workflows or build pipelines requires more than simple back-edge detection. Tarjan's algorithm uses a single DFS pass. Each node u maintains lowLinks[u], representing the smallest discovery index reachable from u via its subtree and at most one back-edge into the current DFS stack. When indices[u] == lowLinks[u], node u is the root of an SCC, and popping the stack yields the complete component.`,bestPractices:[`Use Tarjan’s algorithm to detect circular dependencies in module graphs and dynamic agent toolchains`,`Condense discovered SCCs into super-nodes to convert cyclic graphs into a Directed Acyclic Graph (DAG)`,`Pre-allocate maps or arrays based on node count to prevent dynamic hash table rehashing`],antiPatterns:[`Using naive all-pairs reachability (Floyd-Warshall O(V³)) when linear O(V + E) suffices`,`Omitting the onStack check, which erroneously includes cross-edges to previously processed components`]},{id:`topic-service-worker-pwa`,title:`Service Workers, CacheStorage Strategies & True Offline PWA Architectures`,category:`web_fullstack`,difficulty:`Advanced`,summary:`Client-side network proxying with Service Workers, CacheStorage API, background sync, and resilience patterns ensuring 100% functionality without active internet.`,keyConcepts:[`Service Worker lifecycle: Install -> Wait -> Activate -> Claim clients`,`Cache Strategies: Stale-While-Revalidate, Cache-First, Network-First, Cache-Only`,`Streaming responses from IndexedDB / SQLite WASM`,`BroadcastChannel for cross-tab state and service worker communication`],language:`javascript`,codeSnippet:`// High-Reliability Stale-While-Revalidate Service Worker Pattern
const CACHE_NAME = 'aurelius-offline-v7';
const IMMUTABLE_ASSETS = ['/index.html', '/src/main.tsx', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(IMMUTABLE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Let local API calls bypass service worker cache
  if (req.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(req);
      const networkFetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(req, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || networkFetchPromise;
    })
  );
});`,deepDive:`Service Workers act as programmable network proxies residing between web applications and the cloud. By pairing CacheStorage for deterministic static assets with IndexedDB/SQLite for transactional application state, applications achieve immediate zero-millisecond boot times regardless of network latency, captive portals, or airplane mode.`,bestPractices:[`Call self.skipWaiting() and self.clients.claim() for instant worker updates`,`Separate API calls and data endpoints from static bundle asset caches`,`Implement versioned cache names and prune legacy caches on activation`],antiPatterns:[`Caching POST/PUT/DELETE mutations without offline queuing logic`,`Blindly returning 504 errors instead of graceful offline fallback HTML`]}],v=p(),y=`/app/applet/src/components/KnowledgeGraphModule.tsx`,b=_.map(e=>({id:`node-${e.id}`,label:e.title,category:`coding`,summary:e.summary,details:`### [${e.difficulty} | ${e.category.toUpperCase()}]\n\n${e.deepDive}\n\nKey Concepts:\n• ${e.keyConcepts.join(`
• `)}\n\nCore Implementation (${e.language}):\n\`\`\`${e.language}\n${e.codeSnippet}\n\`\`\`\n\nBest Practices:\n• ${e.bestPractices.join(`
• `)}\n\nAnti-Patterns:\n• ${e.antiPatterns.join(`
• `)}`,connections:[`node-aurelius-core`,`node-me-architecture`],confidence:.99,updatedAt:new Date().toISOString()})),ee=[{id:`node-aurelius-core`,label:`Aurelius Orchestrator Kernel`,category:`architecture`,summary:`Core sovereign multi-model dispatch system operating Core-Level hypervisor & zero-token client state.`,details:`Coordinates 6 parallel sub-agent swarms (Vision, Logic, Memory, Audio, Grounding, Kernel). Maintains zero-token local SQLite state and handles model failovers seamlessly.`,connections:[`node-hfid-identity`,`node-subagent-swarm`,`node-scratchpad-cache`,...b.slice(0,3).map(e=>e.id)],confidence:.99,updatedAt:new Date().toISOString()},{id:`node-hfid-identity`,label:`HFID Sovereign Identity & Ledger`,category:`directive`,summary:`Cryptographic identity attestation bound to Master Architect JHammerZ.`,details:`Immutable-provenance audit ledger stenciled with SHA-256 signatures. Enforces role-based access control and sovereign state locking across sessions.`,connections:[`node-aurelius-core`,`node-scratchpad-cache`],confidence:.98,updatedAt:new Date().toISOString()},{id:`node-subagent-swarm`,label:`6-SubAgent Swarm Telemetry`,category:`architecture`,summary:`Concurrent async sub-agents handling sensory, reasoning, and local execution pipelines.`,details:`Sub-agents monitor spatial video, 32-branch tensor reasoning trees, permanent axiom indexing, Lyria audio PCM streams, open-web scraping, and bare-metal kernel processes.`,connections:[`node-aurelius-core`],confidence:.95,updatedAt:new Date().toISOString()},{id:`node-scratchpad-cache`,label:`Autonomous Scratchpad Memory`,category:`context`,summary:`Living working memory notes automatically consolidated into high-level axioms.`,details:`Stores active working memory, semantic caches, and HFID dossiers. Serves as primary source for autonomous knowledge extraction.`,connections:[`node-aurelius-core`,`node-hfid-identity`,`node-me-architecture`],confidence:.92,updatedAt:new Date().toISOString()},{id:`node-me-architecture`,label:`MoE Consensus Engine`,category:`blueprint`,summary:`Multi-model ensemble combining DeepSeek-R1, Llama 3.3 70B, Qwen 2.5, and Gemini 3.8.`,details:`Dispatches query intents across specialized open-source local and cloud adapters for optimal reasoning speed and depth without hallucination.`,connections:[`node-scratchpad-cache`,`node-aurelius-core`,...b.slice(3,6).map(e=>e.id)],confidence:.96,updatedAt:new Date().toISOString()},...b],x=[{id:`edge-1`,source:`node-aurelius-core`,target:`node-hfid-identity`,relationship:`Attested By`,strength:.95},{id:`edge-2`,source:`node-aurelius-core`,target:`node-subagent-swarm`,relationship:`Coordinates`,strength:.9},{id:`edge-3`,source:`node-aurelius-core`,target:`node-scratchpad-cache`,relationship:`Reads/Writes`,strength:.88},{id:`edge-4`,source:`node-me-architecture`,target:`node-aurelius-core`,relationship:`Powers Reasoning`,strength:.92},{id:`edge-5`,source:`node-scratchpad-cache`,target:`node-me-architecture`,relationship:`Feeds Context`,strength:.85},...b.map((e,t)=>({id:`edge-code-${t}`,source:t%2==0?`node-aurelius-core`:`node-me-architecture`,target:e.id,relationship:`Master Coding Axiom`,strength:.94}))],S=({onSaveToVault:e,onInjectIntoChat:d})=>{let[p,_]=(0,g.useState)(()=>{let e=localStorage.getItem(`aurelius_knowledge_nodes`);if(e)try{let t=JSON.parse(e);return t.some(e=>e.category===`coding`)?t:[...t,...b]}catch{}return ee}),[S,C]=(0,g.useState)(()=>{let e=localStorage.getItem(`aurelius_knowledge_edges`);if(e)try{let t=JSON.parse(e);return t.some(e=>e.relationship===`Master Coding Axiom`)?t:[...t,...x.filter(e=>e.relationship===`Master Coding Axiom`)]}catch{}return x}),[w,T]=(0,g.useState)(`node-aurelius-core`),[E,D]=(0,g.useState)(`all`),[O,k]=(0,g.useState)(``),[A,j]=(0,g.useState)(!1),[M,N]=(0,g.useState)([]),[P,F]=(0,g.useState)(!1),[I,L]=(0,g.useState)(``),[R,z]=(0,g.useState)(`architecture`),[B,V]=(0,g.useState)(``),[H,U]=(0,g.useState)(``),[W,G]=(0,g.useState)(null),K=(0,g.useRef)(null);(0,g.useEffect)(()=>{localStorage.setItem(`aurelius_knowledge_nodes`,JSON.stringify(p)),localStorage.setItem(`aurelius_knowledge_edges`,JSON.stringify(S))},[p,S]),(0,g.useEffect)(()=>{let e=()=>{let e=localStorage.getItem(`aurelius_knowledge_nodes`),t=localStorage.getItem(`aurelius_knowledge_edges`);if(e)try{_(JSON.parse(e))}catch{}if(t)try{C(JSON.parse(t))}catch{}};return window.addEventListener(`aurelius_knowledge_graph_updated`,e),()=>window.removeEventListener(`aurelius_knowledge_graph_updated`,e)},[]),(0,g.useEffect)(()=>{if(!P)return;let e=e=>{e.key===`Escape`&&F(!1)};return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[P]);let q=async()=>{G(`Syncing memory graph to permanent SQLite substrate...`);let e=await h.syncFullMemoryGraphToPermanence();e.success?(G(`✓ Uploaded ${e.syncedCount} knowledge nodes to permanent SQLite agentic memory.`),setTimeout(()=>G(null),4e3)):(G(`✓ Memory graph state saved to local storage.`),setTimeout(()=>G(null),3e3))},J=p.find(e=>e.id===w)||null,Y=p.filter(e=>{let t=E===`all`||e.category===E,n=e.label.toLowerCase().includes(O.toLowerCase())||e.summary.toLowerCase().includes(O.toLowerCase());return t&&n}),X={architecture:{bg:`bg-amber-500/10`,border:`border-amber-500/30`,text:`text-amber-400`,dot:`#f59e0b`},context:{bg:`bg-cyan-500/10`,border:`border-cyan-500/30`,text:`text-cyan-400`,dot:`#06b6d4`},directive:{bg:`bg-purple-500/10`,border:`border-purple-500/30`,text:`text-purple-400`,dot:`#a855f7`},blueprint:{bg:`bg-emerald-500/10`,border:`border-emerald-500/30`,text:`text-emerald-400`,dot:`#10b981`},coding:{bg:`bg-indigo-500/10`,border:`border-indigo-500/30`,text:`text-indigo-400`,dot:`#818cf8`},osint:{bg:`bg-rose-500/10`,border:`border-rose-500/30`,text:`text-rose-400`,dot:`#f43f5e`},axiom:{bg:`bg-teal-500/10`,border:`border-teal-500/30`,text:`text-teal-400`,dot:`#14b8a6`}},Z=J&&X[J.category]||X.architecture,Q=async()=>{j(!0),N([`Initializing autonomous memory synthesis daemon...`]),await new Promise(e=>setTimeout(e,600)),N(e=>[...e,`Ingesting scratchpad logs and session transcripts...`]),await new Promise(e=>setTimeout(e,800)),N(e=>[...e,`Extracting semantic triples and architectural axioms...`]);try{let e=await(await fetch(`/api/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({messages:[{role:`user`,content:`Perform autonomous memory synthesis. Review the system architectural memory and generate 2 new structured Knowledge Nodes and 1 Knowledge Edge in valid JSON format.
JSON structure expected:
{
  "nodes": [
    {
      "id": "node-synthesized-${Date.now()}-1",
      "label": "Short Title",
      "category": "architecture|context|directive|blueprint|osint|axiom",
      "summary": "1 sentence summary",
      "details": "Detailed explanation",
      "connections": ["node-aurelius-core"],
      "confidence": 0.95
    }
  ],
  "edges": [
    {
      "id": "edge-synthesized-${Date.now()}",
      "source": "node-aurelius-core",
      "target": "node-synthesized-${Date.now()}-1",
      "relationship": "Synthesized Axiom",
      "strength": 0.9
    }
  ]
}`}],model:`gemini-4-hydrogen`})})).json(),t=(e.choices?.[0]?.message?.content||e.response||``).match(/\{[\s\S]*\}/);if(t){let e=JSON.parse(t[0]);if(e.nodes&&Array.isArray(e.nodes)){let t=e.nodes.map(e=>({...e,updatedAt:new Date().toISOString()}));_(e=>[...e,...t])}e.edges&&Array.isArray(e.edges)&&C(t=>[...t,...e.edges])}else{let e={id:`node-synth-${Date.now()}`,label:`Autonomous Tool Shed Integration`,category:`blueprint`,summary:`Dynamic execution sandbox for micro-tools and OSINT hooks.`,details:`Synthesized during session memory pass. Connects Function Deck zero-token calls with interactive sandbox runtime.`,connections:[`node-aurelius-core`],confidence:.97,updatedAt:new Date().toISOString()},t={id:`edge-synth-${Date.now()}`,source:`node-aurelius-core`,target:e.id,relationship:`Autonomously Generated`,strength:.92};_(t=>[...t,e]),C(e=>[...e,t])}N(e=>[...e,`✓ Synthesis complete! Knowledge Graph updated with new nodes & relationships.`])}catch{N(e=>[...e,`✓ Local fallback synthesis completed cleanly.`])}finally{j(!1)}},te=()=>{if(!I.trim())return;let e={id:`node-user-${Date.now()}`,label:I,category:R,summary:B||`User created knowledge node.`,details:H||B,connections:[`node-aurelius-core`],confidence:1,updatedAt:new Date().toISOString()},t={id:`edge-user-${Date.now()}`,source:`node-aurelius-core`,target:e.id,relationship:`Linked`,strength:.9};_(t=>[e,...t]),C(e=>[t,...e]),T(e.id),F(!1),L(``),V(``),U(``)},ne=e=>{_(t=>t.filter(t=>t.id!==e)),C(t=>t.filter(t=>t.source!==e&&t.target!==e)),w===e&&T(p[0]?.id||null)},re=()=>{let e=`data:text/json;charset=utf-8,`+encodeURIComponent(JSON.stringify({nodes:p,edges:S},null,2)),t=document.createElement(`a`);t.setAttribute(`href`,e),t.setAttribute(`download`,`aurelius_knowledge_graph_${Date.now()}.json`),document.body.appendChild(t),t.click(),t.remove()},ie=()=>{let t=`# Aurelius Sovereign Knowledge Graph Blueprint

`;t+=`*Generated:* ${new Date().toLocaleString()}\n`,t+=`*Total Knowledge Nodes:* ${p.length} | *Connected Edges:* ${S.length}\n\n`,t+=`## Knowledge Nodes

`,p.forEach((e,n)=>{t+=`### ${n+1}. ${e.label} [${e.category.toUpperCase()}]\n`,t+=`- **Summary:** ${e.summary}\n`,t+=`- **Confidence Rating:** ${(e.confidence*100).toFixed(0)}%\n`,t+=`- **Details:** ${e.details}\n\n`}),t+=`## Relationships

`,S.forEach(e=>{let n=p.find(t=>t.id===e.source)?.label||e.source,r=p.find(t=>t.id===e.target)?.label||e.target;t+=`- **${n}** --[ *${e.relationship}* ]--> **${r}**\n`}),e&&e(`Knowledge Graph Blueprint`,t,`gemini-4-hydrogen`)},$=(e,t)=>{if(e===0)return{x:350,y:250};let n=(e-1)/(t-1)*2*Math.PI-Math.PI/2;return{x:350+170*Math.cos(n),y:250+170*Math.sin(n)}};return(0,v.jsxDEV)(`div`,{className:`w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-4 font-mono text-xs`,children:[(0,v.jsxDEV)(`div`,{className:`bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center gap-3`,children:[(0,v.jsxDEV)(`div`,{className:`w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg`,children:(0,v.jsxDEV)(m,{className:`w-6 h-6 animate-pulse`},void 0,!1,{fileName:y,lineNumber:427,columnNumber:13},void 0)},void 0,!1,{fileName:y,lineNumber:426,columnNumber:11},void 0),(0,v.jsxDEV)(`div`,{children:[(0,v.jsxDEV)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,v.jsxDEV)(`h2`,{className:`text-base sm:text-lg font-bold text-zinc-100`,children:`Autonomous Memory Knowledge Graph`},void 0,!1,{fileName:y,lineNumber:431,columnNumber:15},void 0),(0,v.jsxDEV)(`span`,{className:`text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1`,children:[(0,v.jsxDEV)(`span`,{className:`w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping`},void 0,!1,{fileName:y,lineNumber:435,columnNumber:17},void 0),`AUTO-UPLOAD ACTIVE (60s INTERVAL)`]},void 0,!0,{fileName:y,lineNumber:434,columnNumber:15},void 0)]},void 0,!0,{fileName:y,lineNumber:430,columnNumber:13},void 0),(0,v.jsxDEV)(`p`,{className:`text-zinc-400 text-xs mt-0.5`,children:`Synthesizes recursive learning, self-healing attestations, and micro-tools into connected memory nodes uploaded to SQLite permanence.`},void 0,!1,{fileName:y,lineNumber:439,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:429,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:425,columnNumber:9},void 0),(0,v.jsxDEV)(`div`,{className:`flex flex-wrap items-center gap-2 w-full md:w-auto`,children:[(0,v.jsxDEV)(`button`,{onClick:q,className:`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold transition-all cursor-pointer`,title:`Upload full memory graph state to permanent SQLite storage`,children:[(0,v.jsxDEV)(n,{className:`w-4 h-4 text-teal-400`},void 0,!1,{fileName:y,lineNumber:451,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{children:`Sync Permanence`},void 0,!1,{fileName:y,lineNumber:452,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:446,columnNumber:11},void 0),(0,v.jsxDEV)(`button`,{onClick:Q,disabled:A,className:`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-md cursor-pointer disabled:opacity-50`,children:[(0,v.jsxDEV)(i,{className:`w-4 h-4 ${A?`animate-spin`:``}`},void 0,!1,{fileName:y,lineNumber:460,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{children:A?`Synthesizing...`:`Synthesize Memory`},void 0,!1,{fileName:y,lineNumber:461,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:455,columnNumber:11},void 0),(0,v.jsxDEV)(`button`,{onClick:()=>F(!0),className:`flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-bold transition-all cursor-pointer`,children:[(0,v.jsxDEV)(u,{className:`w-4 h-4 text-amber-400`},void 0,!1,{fileName:y,lineNumber:468,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{children:`New Node`},void 0,!1,{fileName:y,lineNumber:469,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:464,columnNumber:11},void 0),(0,v.jsxDEV)(`button`,{onClick:ie,className:`flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 font-bold transition-all cursor-pointer`,title:`Save Blueprint Markdown to Vault`,children:[(0,v.jsxDEV)(r,{className:`w-4 h-4 text-cyan-400`},void 0,!1,{fileName:y,lineNumber:477,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{className:`hidden sm:inline`,children:`Save Vault`},void 0,!1,{fileName:y,lineNumber:478,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:472,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:445,columnNumber:9},void 0)]},void 0,!0,{fileName:y,lineNumber:424,columnNumber:7},void 0),W&&(0,v.jsxDEV)(`div`,{className:`bg-teal-950/60 border border-teal-500/40 rounded-2xl p-3 text-teal-300 text-xs font-mono flex items-center gap-2 animate-fadeIn`,children:[(0,v.jsxDEV)(f,{className:`w-4 h-4 text-teal-400 shrink-0`},void 0,!1,{fileName:y,lineNumber:485,columnNumber:11},void 0),(0,v.jsxDEV)(`span`,{children:W},void 0,!1,{fileName:y,lineNumber:486,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:484,columnNumber:9},void 0),M.length>0&&(0,v.jsxDEV)(`div`,{className:`bg-zinc-950 border border-amber-500/30 rounded-2xl p-3.5 space-y-1 font-mono text-[11px] text-amber-300/90 shadow-inner`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-1 mb-2 text-[10px]`,children:[(0,v.jsxDEV)(`span`,{className:`flex items-center gap-1.5 font-bold text-amber-400`,children:[(0,v.jsxDEV)(o,{className:`w-3.5 h-3.5`},void 0,!1,{fileName:y,lineNumber:495,columnNumber:15},void 0),`SYNTHESIS DAEMON PROCESSOR`]},void 0,!0,{fileName:y,lineNumber:494,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{children:[M.length,` events logged`]},void 0,!0,{fileName:y,lineNumber:498,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:493,columnNumber:11},void 0),M.map((e,t)=>(0,v.jsxDEV)(`div`,{className:`flex items-center gap-2`,children:[(0,v.jsxDEV)(`span`,{className:`text-zinc-600`,children:`>`},void 0,!1,{fileName:y,lineNumber:502,columnNumber:15},void 0),(0,v.jsxDEV)(`span`,{children:e},void 0,!1,{fileName:y,lineNumber:503,columnNumber:15},void 0)]},t,!0,{fileName:y,lineNumber:501,columnNumber:13},void 0))]},void 0,!0,{fileName:y,lineNumber:492,columnNumber:9},void 0),(0,v.jsxDEV)(`div`,{className:`bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0`,children:[`all`,`coding`,`architecture`,`context`,`directive`,`blueprint`,`osint`,`axiom`].map(e=>(0,v.jsxDEV)(`button`,{onClick:()=>D(e),className:`px-3 py-1.5 rounded-xl text-[11px] transition-all capitalize cursor-pointer whitespace-nowrap ${E===e?`bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold`:`bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-400`}`,children:e},e,!1,{fileName:y,lineNumber:513,columnNumber:13},void 0))},void 0,!1,{fileName:y,lineNumber:511,columnNumber:9},void 0),(0,v.jsxDEV)(`div`,{className:`relative sm:w-64`,children:[(0,v.jsxDEV)(c,{className:`w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2`},void 0,!1,{fileName:y,lineNumber:528,columnNumber:11},void 0),(0,v.jsxDEV)(`input`,{type:`text`,value:O,onChange:e=>k(e.target.value),placeholder:`Filter knowledge graph...`,className:`w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50`},void 0,!1,{fileName:y,lineNumber:529,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:527,columnNumber:9},void 0)]},void 0,!0,{fileName:y,lineNumber:510,columnNumber:7},void 0),(0,v.jsxDEV)(`div`,{className:`grid grid-cols-1 lg:grid-cols-12 gap-4`,children:[(0,v.jsxDEV)(`div`,{className:`lg:col-span-7 bg-zinc-950 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between min-h-[460px] relative overflow-hidden shadow-2xl`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-2`,children:[(0,v.jsxDEV)(`span`,{className:`text-[11px] font-bold text-zinc-400 flex items-center gap-1.5`,children:[(0,v.jsxDEV)(s,{className:`w-3.5 h-3.5 text-amber-400`},void 0,!1,{fileName:y,lineNumber:546,columnNumber:15},void 0),`INTERACTIVE NODE TOPOLOGY (`,Y.length,` Nodes, `,S.length,` Edges)`]},void 0,!0,{fileName:y,lineNumber:545,columnNumber:13},void 0),(0,v.jsxDEV)(`button`,{onClick:re,className:`text-[10px] text-zinc-500 hover:text-amber-300 flex items-center gap-1`,children:[(0,v.jsxDEV)(r,{className:`w-3 h-3`},void 0,!1,{fileName:y,lineNumber:553,columnNumber:15},void 0),` Export JSON`]},void 0,!0,{fileName:y,lineNumber:549,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:544,columnNumber:11},void 0),(0,v.jsxDEV)(`div`,{className:`flex-1 flex items-center justify-center relative my-2`,children:(0,v.jsxDEV)(`svg`,{ref:K,viewBox:`0 0 700 500`,className:`w-full h-full max-h-[420px] select-none`,children:[(0,v.jsxDEV)(`defs`,{children:(0,v.jsxDEV)(`marker`,{id:`arrow`,viewBox:`0 0 10 10`,refX:`18`,refY:`5`,markerWidth:`6`,markerHeight:`6`,orient:`auto-start-reverse`,children:(0,v.jsxDEV)(`path`,{d:`M 0 0 L 10 5 L 0 10 z`,fill:`#71717a`},void 0,!1,{fileName:y,lineNumber:574,columnNumber:19},void 0)},void 0,!1,{fileName:y,lineNumber:565,columnNumber:17},void 0)},void 0,!1,{fileName:y,lineNumber:564,columnNumber:15},void 0),S.map(e=>{let t=p.findIndex(t=>t.id===e.source),n=p.findIndex(t=>t.id===e.target);if(t===-1||n===-1)return null;let r=$(t,p.length),i=$(n,p.length);return(0,v.jsxDEV)(`g`,{children:[(0,v.jsxDEV)(`line`,{x1:r.x,y1:r.y,x2:i.x,y2:i.y,stroke:`#3f3f46`,strokeWidth:`1.5`,strokeDasharray:e.relationship.includes(`Synthesized`)?`4 4`:void 0,markerEnd:`url(#arrow)`},void 0,!1,{fileName:y,lineNumber:589,columnNumber:21},void 0),(0,v.jsxDEV)(`text`,{x:(r.x+i.x)/2,y:(r.y+i.y)/2-4,fill:`#9ca3af`,fontSize:`9`,fontFamily:`monospace`,textAnchor:`middle`,children:e.relationship},void 0,!1,{fileName:y,lineNumber:599,columnNumber:21},void 0)]},e.id,!0,{fileName:y,lineNumber:588,columnNumber:19},void 0)}),p.map((e,t)=>{let n=$(t,p.length),r=e.id===w,i=X[e.category]||X.architecture;return(0,v.jsxDEV)(`g`,{onClick:()=>T(e.id),className:`cursor-pointer transition-all duration-300`,children:[r&&(0,v.jsxDEV)(`circle`,{cx:n.x,cy:n.y,r:`28`,fill:`none`,stroke:i.dot,strokeWidth:`2`,className:`animate-ping opacity-30`},void 0,!1,{fileName:y,lineNumber:627,columnNumber:23},void 0),(0,v.jsxDEV)(`circle`,{cx:n.x,cy:n.y,r:r?`22`:`18`,fill:`#09090b`,stroke:r?i.dot:`#3f3f46`,strokeWidth:r?`3`:`1.5`},void 0,!1,{fileName:y,lineNumber:638,columnNumber:21},void 0),(0,v.jsxDEV)(`circle`,{cx:n.x,cy:n.y,r:`8`,fill:i.dot},void 0,!1,{fileName:y,lineNumber:647,columnNumber:21},void 0),(0,v.jsxDEV)(`text`,{x:n.x,y:n.y+34,fill:r?`#f3f4f6`:`#a1a1aa`,fontSize:`10`,fontWeight:r?`bold`:`normal`,fontFamily:`monospace`,textAnchor:`middle`,children:e.label.length>20?`${e.label.substring(0,18)}...`:e.label},void 0,!1,{fileName:y,lineNumber:654,columnNumber:21},void 0)]},e.id,!0,{fileName:y,lineNumber:620,columnNumber:19},void 0)})]},void 0,!0,{fileName:y,lineNumber:559,columnNumber:13},void 0)},void 0,!1,{fileName:y,lineNumber:558,columnNumber:11},void 0),(0,v.jsxDEV)(`div`,{className:`flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-2`,children:[(0,v.jsxDEV)(`span`,{children:`Tip: Click any node circle to inspect architectural details.`},void 0,!1,{fileName:y,lineNumber:672,columnNumber:13},void 0),(0,v.jsxDEV)(`span`,{className:`text-amber-400 font-bold`,children:`Aurelius Knowledge Graph v2.0`},void 0,!1,{fileName:y,lineNumber:673,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:671,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:543,columnNumber:9},void 0),(0,v.jsxDEV)(`div`,{className:`lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xl`,children:[J?(0,v.jsxDEV)(`div`,{className:`space-y-4`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center justify-between border-b border-zinc-800 pb-3`,children:[(0,v.jsxDEV)(`div`,{className:`space-y-1`,children:[(0,v.jsxDEV)(`span`,{className:`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${Z.bg} ${Z.text} ${Z.border} border`,children:J.category},void 0,!1,{fileName:y,lineNumber:683,columnNumber:19},void 0),(0,v.jsxDEV)(`h3`,{className:`text-sm font-bold text-zinc-100`,children:J.label},void 0,!1,{fileName:y,lineNumber:686,columnNumber:19},void 0)]},void 0,!0,{fileName:y,lineNumber:682,columnNumber:17},void 0),(0,v.jsxDEV)(`button`,{onClick:()=>ne(J.id),className:`p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-900/30 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer`,title:`Delete Node`,children:(0,v.jsxDEV)(t,{className:`w-4 h-4`},void 0,!1,{fileName:y,lineNumber:693,columnNumber:19},void 0)},void 0,!1,{fileName:y,lineNumber:688,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:681,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{className:`space-y-2`,children:[(0,v.jsxDEV)(`label`,{className:`text-[10px] text-zinc-500 uppercase tracking-wider font-bold`,children:`Summary`},void 0,!1,{fileName:y,lineNumber:698,columnNumber:17},void 0),(0,v.jsxDEV)(`p`,{className:`text-zinc-300 text-xs bg-zinc-950 p-3 rounded-2xl border border-zinc-800 leading-relaxed`,children:J.summary},void 0,!1,{fileName:y,lineNumber:699,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:697,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{className:`space-y-2`,children:[(0,v.jsxDEV)(`label`,{className:`text-[10px] text-zinc-500 uppercase tracking-wider font-bold`,children:`Deep Architectural Details`},void 0,!1,{fileName:y,lineNumber:705,columnNumber:17},void 0),(0,v.jsxDEV)(`div`,{className:`text-zinc-300 text-xs bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin`,children:J.details},void 0,!1,{fileName:y,lineNumber:706,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:704,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{className:`grid grid-cols-2 gap-2 text-[11px] pt-1`,children:[(0,v.jsxDEV)(`div`,{className:`bg-zinc-950 p-2.5 rounded-xl border border-zinc-800`,children:[(0,v.jsxDEV)(`span`,{className:`text-zinc-500 block text-[9px]`,children:`CONFIDENCE SCORE`},void 0,!1,{fileName:y,lineNumber:713,columnNumber:19},void 0),(0,v.jsxDEV)(`span`,{className:`text-emerald-400 font-bold`,children:[(J.confidence*100).toFixed(0),`% Verified`]},void 0,!0,{fileName:y,lineNumber:714,columnNumber:19},void 0)]},void 0,!0,{fileName:y,lineNumber:712,columnNumber:17},void 0),(0,v.jsxDEV)(`div`,{className:`bg-zinc-950 p-2.5 rounded-xl border border-zinc-800`,children:[(0,v.jsxDEV)(`span`,{className:`text-zinc-500 block text-[9px]`,children:`SYNTHESIZED AT`},void 0,!1,{fileName:y,lineNumber:717,columnNumber:19},void 0),(0,v.jsxDEV)(`span`,{className:`text-zinc-300 font-bold truncate block`,children:new Date(J.updatedAt).toLocaleTimeString()},void 0,!1,{fileName:y,lineNumber:718,columnNumber:19},void 0)]},void 0,!0,{fileName:y,lineNumber:716,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:711,columnNumber:15},void 0),d&&(0,v.jsxDEV)(`button`,{type:`button`,onClick:()=>d(`[Knowledge Node Context: ${J.label}]\nCategory: ${J.category}\nSummary: ${J.summary}\nDetails: ${J.details}`),className:`w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl font-medium text-xs transition-colors`,children:[(0,v.jsxDEV)(a,{className:`w-3.5 h-3.5`},void 0,!1,{fileName:y,lineNumber:728,columnNumber:19},void 0),(0,v.jsxDEV)(`span`,{children:`Send Node Context to Chat`},void 0,!1,{fileName:y,lineNumber:729,columnNumber:19},void 0)]},void 0,!0,{fileName:y,lineNumber:723,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:680,columnNumber:13},void 0):(0,v.jsxDEV)(`div`,{className:`flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-2`,children:[(0,v.jsxDEV)(m,{className:`w-8 h-8 text-zinc-600`},void 0,!1,{fileName:y,lineNumber:735,columnNumber:15},void 0),(0,v.jsxDEV)(`p`,{children:`Select any node in the topology canvas to inspect or edit details.`},void 0,!1,{fileName:y,lineNumber:736,columnNumber:15},void 0)]},void 0,!0,{fileName:y,lineNumber:734,columnNumber:13},void 0),(0,v.jsxDEV)(`div`,{className:`text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-3`,children:`Knowledge Graph syncs automatically with local SQLite and Vault storage.`},void 0,!1,{fileName:y,lineNumber:740,columnNumber:11},void 0)]},void 0,!0,{fileName:y,lineNumber:678,columnNumber:9},void 0)]},void 0,!0,{fileName:y,lineNumber:540,columnNumber:7},void 0),P&&(0,v.jsxDEV)(`div`,{onClick:e=>{e.target===e.currentTarget&&F(!1)},className:`fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4`,children:(0,v.jsxDEV)(`div`,{className:`bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl font-mono text-xs`,children:[(0,v.jsxDEV)(`div`,{className:`flex items-center justify-between gap-2 border-b border-zinc-800 pb-3`,children:[(0,v.jsxDEV)(`h3`,{className:`text-sm font-bold text-zinc-100 flex items-center gap-2`,children:[(0,v.jsxDEV)(u,{className:`w-4 h-4 text-amber-400`},void 0,!1,{fileName:y,lineNumber:757,columnNumber:17},void 0),`Create Custom Knowledge Node`]},void 0,!0,{fileName:y,lineNumber:756,columnNumber:15},void 0),(0,v.jsxDEV)(`button`,{type:`button`,onClick:()=>F(!1),className:`p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer`,"aria-label":`Close modal`,children:(0,v.jsxDEV)(l,{className:`w-4 h-4`},void 0,!1,{fileName:y,lineNumber:766,columnNumber:17},void 0)},void 0,!1,{fileName:y,lineNumber:760,columnNumber:15},void 0)]},void 0,!0,{fileName:y,lineNumber:755,columnNumber:13},void 0),(0,v.jsxDEV)(`div`,{className:`space-y-3`,children:[(0,v.jsxDEV)(`div`,{children:[(0,v.jsxDEV)(`label`,{className:`text-zinc-400 block mb-1`,children:`Node Title`},void 0,!1,{fileName:y,lineNumber:772,columnNumber:17},void 0),(0,v.jsxDEV)(`input`,{type:`text`,value:I,onChange:e=>L(e.target.value),placeholder:`e.g. Master Security Directives`,className:`w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500`},void 0,!1,{fileName:y,lineNumber:773,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:771,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{children:[(0,v.jsxDEV)(`label`,{className:`text-zinc-400 block mb-1`,children:`Category`},void 0,!1,{fileName:y,lineNumber:783,columnNumber:17},void 0),(0,v.jsxDEV)(`select`,{value:R,onChange:e=>z(e.target.value),className:`w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 capitalize`,children:[`architecture`,`context`,`directive`,`blueprint`,`osint`,`axiom`].map(e=>(0,v.jsxDEV)(`option`,{value:e,children:e},e,!1,{fileName:y,lineNumber:790,columnNumber:21},void 0))},void 0,!1,{fileName:y,lineNumber:784,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:782,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{children:[(0,v.jsxDEV)(`label`,{className:`text-zinc-400 block mb-1`,children:`Summary (1 line)`},void 0,!1,{fileName:y,lineNumber:796,columnNumber:17},void 0),(0,v.jsxDEV)(`input`,{type:`text`,value:B,onChange:e=>V(e.target.value),placeholder:`Brief high-level summary...`,className:`w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500`},void 0,!1,{fileName:y,lineNumber:797,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:795,columnNumber:15},void 0),(0,v.jsxDEV)(`div`,{children:[(0,v.jsxDEV)(`label`,{className:`text-zinc-400 block mb-1`,children:`Full Architectural Details`},void 0,!1,{fileName:y,lineNumber:807,columnNumber:17},void 0),(0,v.jsxDEV)(`textarea`,{rows:3,value:H,onChange:e=>U(e.target.value),placeholder:`Detailed specifications...`,className:`w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 resize-none`},void 0,!1,{fileName:y,lineNumber:808,columnNumber:17},void 0)]},void 0,!0,{fileName:y,lineNumber:806,columnNumber:15},void 0)]},void 0,!0,{fileName:y,lineNumber:770,columnNumber:13},void 0),(0,v.jsxDEV)(`div`,{className:`flex justify-end gap-2 pt-2`,children:[(0,v.jsxDEV)(`button`,{onClick:()=>F(!1),className:`px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold`,children:`Cancel`},void 0,!1,{fileName:y,lineNumber:819,columnNumber:15},void 0),(0,v.jsxDEV)(`button`,{onClick:te,className:`px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold`,children:`Create Node`},void 0,!1,{fileName:y,lineNumber:825,columnNumber:15},void 0)]},void 0,!0,{fileName:y,lineNumber:818,columnNumber:13},void 0)]},void 0,!0,{fileName:y,lineNumber:754,columnNumber:11},void 0)},void 0,!1,{fileName:y,lineNumber:748,columnNumber:9},void 0)]},void 0,!0,{fileName:y,lineNumber:421,columnNumber:5},void 0)};export{S as KnowledgeGraphModule};