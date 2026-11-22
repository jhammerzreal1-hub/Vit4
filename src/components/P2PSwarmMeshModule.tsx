/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, Radio, Plus, Server, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/authClient';

interface MeshNodeItem {
  id: string;
  name: string;
  role: string;
  status: 'SYNCHRONIZED' | 'ACTIVE_AGENT' | 'RELAY_NODE';
  latencyMs: number;
  endpoint: string;
  radioSummary: string;
  isLocal: boolean;
}

interface MeshStatusPayload {
  localMeshId: string;
  consensusHash: string;
  merkleRoot: string;
  totalNodes: number;
  federatedPeerCount: number;
  serversCount: number;
  channelsCount: number;
  recentMessagesCount: number;
  activeDaemonsCount: number;
  nodes: MeshNodeItem[];
  servers: Array<{
    id: string;
    name: string;
    region: string;
    frequencyMhz: number;
    spreadingFactor: number;
  }>;
}

export const P2PSwarmMeshModule: React.FC = () => {
  const [mesh, setMesh] = useState<MeshStatusPayload | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [peerLabel, setPeerLabel] = useState('');
  const [peerUrl, setPeerUrl] = useState('');
  const [isAddingPeer, setIsAddingPeer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMesh = async () => {
    try {
      const res = await apiFetch('/api/singularity/mesh/status');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMesh(data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load LoRa & P2P mesh status.');
    }
  };

  useEffect(() => {
    loadMesh();
  }, []);

  const syncMesh = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/mesh/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Mesh sync failed.');
      if (data.status) setMesh(data.status);
      setLastSyncedAt(data.timestamp || new Date().toISOString());
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to synchronize mesh.');
    } finally {
      setIsSyncing(false);
    }
  };

  const addFederatedPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerLabel.trim() || !peerUrl.trim()) return;
    setIsAddingPeer(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/singularity/mesh/peers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: peerLabel, baseUrl: peerUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not register federated peer.');
      if (data.status) setMesh(data.status);
      setPeerLabel('');
      setPeerUrl('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add peer.');
    } finally {
      setIsAddingPeer(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 tracking-tight">
            Distributed P2P & LoRa Swarm Mesh Federation
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono">{mesh ? `Mesh ${mesh.localMeshId}` : 'Loading topology…'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {mesh ? `SHA-256 ${mesh.consensusHash.slice(0, 14)}…` : ''}
            </span>
            {lastSyncedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Synced {new Date(lastSyncedAt).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={syncMesh}
          disabled={isSyncing}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing Topology…' : 'Sync Mesh State'}
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Active Mesh Nodes</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-indigo-400">
              {mesh ? mesh.totalNodes : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {mesh ? `${mesh.federatedPeerCount} external peer(s)` : 'Inspecting loraMeshService…'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Mesh Channels & Servers</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-cyan-400">
              {mesh ? `${mesh.serversCount} / ${mesh.channelsCount}` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
              {mesh ? `${mesh.recentMessagesCount} recent mesh packets` : ''}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Active OS Daemons</div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-emerald-400">
              {mesh ? mesh.activeDaemonsCount : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400">Background OS supervisors</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400">Merkle State Anchor</div>
            <div className="mt-2 text-base font-semibold font-mono text-slate-100 truncate">
              {mesh ? `${mesh.merkleRoot.slice(0, 14)}…` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-400">Verified SHA-256 project root</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Server className="w-4 h-4 text-indigo-400" />
                Live Local Host, Resident Agents & Federated Peers
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">{mesh?.nodes.length || 0} entries</span>
            </div>
            {(mesh?.nodes || []).map((node) => (
              <div key={node.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-900">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">{node.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{node.role}</div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    {node.endpoint} · {node.radioSummary}
                  </div>
                </div>
                <div className="text-right shrink-0 text-xs font-mono tabular-nums">
                  <div className="text-emerald-400">
                    {node.status === 'SYNCHRONIZED' ? 'Synced' : node.status === 'ACTIVE_AGENT' ? 'Resident' : 'Relay'}
                  </div>
                  <div className="text-slate-400">{node.latencyMs}ms</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80">
              <div className="p-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Radio className="w-4 h-4 text-teal-400" />
                LoRa Radio Profiles
              </div>
              {(mesh?.servers || []).map((srv) => (
                <div key={srv.id} className="p-3.5 text-xs space-y-1">
                  <div className="font-medium text-slate-100">{srv.name}</div>
                  <div className="font-mono text-slate-400 tabular-nums">
                    {srv.region} · {srv.frequencyMhz} MHz · SF{srv.spreadingFactor}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addFederatedPeer} className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                Register Federated Mesh Peer
              </div>
              <input
                value={peerLabel}
                onChange={(e) => setPeerLabel(e.target.value)}
                placeholder="Peer label (e.g. Home Workstation)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <input
                value={peerUrl}
                onChange={(e) => setPeerUrl(e.target.value)}
                placeholder="https://peer-node.example.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isAddingPeer}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {isAddingPeer ? 'Registering…' : 'Add Federated Peer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
