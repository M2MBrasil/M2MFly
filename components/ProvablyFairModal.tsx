'use client';

import React, { useState } from 'react';
import { ProvablyFairRound } from '@/types/game';
import { verifyProvablyFair } from '@/lib/provably-fair';
import { ShieldCheck, X, Check, Copy, HelpCircle, Calculator, Hash } from 'lucide-react';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRound: ProvablyFairRound | null;
  clientSeed: string;
  onUpdateClientSeed: (newSeed: string) => void;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  currentRound,
  clientSeed,
  onUpdateClientSeed,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'verifier' | 'math'>('current');
  const [customClientSeed, setCustomClientSeed] = useState(clientSeed);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Verifier tool state
  const [vServerSeed, setVServerSeed] = useState('');
  const [vClientSeed, setVClientSeed] = useState('');
  const [vNonce, setVNonce] = useState(1);
  const [vResult, setVResult] = useState<{
    hash: string;
    multiplier: number;
    raw: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    if (!vServerSeed || !vClientSeed) return;
    setIsVerifying(true);
    try {
      const res = await verifyProvablyFair(vServerSeed.trim(), vClientSeed.trim(), Number(vNonce));
      setVResult(res);
    } catch {
      // Ignore
    } finally {
      setIsVerifying(false);
    }
  };

  const loadCurrentIntoVerifier = () => {
    if (!currentRound) return;
    setVServerSeed(currentRound.serverSeed);
    setVClientSeed(currentRound.clientSeed);
    setVNonce(currentRound.nonce);
    setActiveTab('verifier');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="provably-fair-dialog"
        className="relative w-full max-w-2xl bg-slate-950 border border-blue-800/60 rounded-2xl shadow-[0_0_50px_rgba(14,165,233,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/40 bg-gradient-to-r from-blue-950/80 via-slate-950 to-blue-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-900/40 border border-cyan-500/40 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Provably Fair • M2MFly
              </h2>
              <p className="text-xs text-blue-300/70">
                Auditoria e verificação criptográfica de integridade e imparcialidade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-blue-950 text-slate-400 hover:text-white border border-blue-900/40 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-blue-900/30 bg-slate-950">
          <button
            onClick={() => setActiveTab('current')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'current'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Rodada Atual
          </button>
          <button
            onClick={() => setActiveTab('verifier')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'verifier'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Verificador Independente
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'math'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Matemática & RTP 97%
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'current' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/50 text-slate-300 leading-relaxed">
                Antes de cada voo iniciar, o servidor calcula o multiplicador com antecedência. O hash do segredo (Server Seed) é pré-compromissado para garantir que o resultado não pode ser alterado durante o voo.
              </div>

              {currentRound && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-300">Server Seed (Segredo do Servidor):</span>
                      <button
                        onClick={() => copyToClipboard(currentRound.serverSeed, 'serverSeed')}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'serverSeed' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'serverSeed' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 break-all border border-blue-900/40 select-all">
                      {currentRound.serverSeed}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-300">Hash SHA-256 (Server Seed Hash):</span>
                      <button
                        onClick={() => copyToClipboard(currentRound.serverSeedHash, 'serverHash')}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'serverHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'serverHash' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-cyan-300 break-all border border-blue-900/40 select-all">
                      {currentRound.serverSeedHash}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-semibold text-slate-300 block mb-1">Client Seed:</span>
                      <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 break-all border border-blue-900/40">
                        {currentRound.clientSeed}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-300 block mb-1">Nonce (Rodada):</span>
                      <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-300 border border-blue-900/40">
                        #{currentRound.nonce}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Hash Final da Rodada (SHA-256):</span>
                    <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-indigo-300 break-all border border-blue-900/40">
                      {currentRound.hash}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-700/40 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Multiplicador Final Calculado:</span>
                      <span className="text-xl font-bold font-mono text-cyan-300">
                        {currentRound.crashMultiplier.toFixed(2)}x
                      </span>
                    </div>
                    <button
                      onClick={loadCurrentIntoVerifier}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer text-xs shadow"
                    >
                      Auditar no Verificador
                    </button>
                  </div>
                </div>
              )}

              {/* Customize Client Seed */}
              <div className="pt-2 border-t border-blue-900/30">
                <label className="font-semibold text-slate-300 block mb-1">
                  Seu Client Seed (Personalizável para próximas rodadas):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customClientSeed}
                    onChange={(e) => setCustomClientSeed(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-blue-900/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => {
                      onUpdateClientSeed(customClientSeed);
                      copyToClipboard(customClientSeed, 'seedUpdated');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-cyan-300 font-semibold border border-blue-700/40 cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verifier' && (
            <div className="space-y-3.5">
              <p className="text-slate-300 leading-relaxed">
                Insira as sementes de qualquer rodada anterior para recalcular a função criptográfica e comprovar que o multiplicador é imutável.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Server Seed:</label>
                <input
                  type="text"
                  placeholder="Ex: 8a4f9b2c..."
                  value={vServerSeed}
                  onChange={(e) => setVServerSeed(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-blue-900/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Client Seed:</label>
                  <input
                    type="text"
                    placeholder="Semente do jogador"
                    value={vClientSeed}
                    onChange={(e) => setVClientSeed(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-blue-900/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nonce (Rodada):</label>
                  <input
                    type="number"
                    min={1}
                    value={vNonce}
                    onChange={(e) => setVNonce(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-blue-900/50 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying || !vServerSeed || !vClientSeed}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold cursor-pointer disabled:opacity-50 transition shadow"
              >
                {isVerifying ? 'Calculando Hash...' : 'Verificar Cálculo Matematicamente'}
              </button>

              {vResult && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Check className="w-4 h-4" />
                    Cálculo Criptográfico Verificado com Sucesso!
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Hash Gerado:</span>
                    <span className="font-mono text-[11px] text-cyan-300 break-all">{vResult.hash}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-blue-900/40">
                    <span className="text-slate-300">Multiplicador Resultante:</span>
                    <span className="text-lg font-mono font-bold text-cyan-400">
                      {vResult.multiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'math' && (
            <div className="space-y-3.5 text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/50">
                <h4 className="font-bold text-cyan-300 mb-1">Distribuição de Probabilidade & RTP 97%</h4>
                <p>
                  Com um RTP padrão de 97% (margem da casa de 3%), a probabilidade de um voo alcançar qualquer multiplicador <span className="font-mono text-white">X</span> é descrita por:
                </p>
                <div className="p-2.5 my-2 rounded-lg bg-slate-900 font-mono text-sm text-center text-cyan-400 border border-blue-900/40">
                  P(chegar a X) ≈ 0.97 / X
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-blue-900/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-950/60 border-b border-blue-900/40 text-cyan-300 font-semibold">
                      <th className="p-2.5">Multiplicador (X)</th>
                      <th className="p-2.5">Chance de Alcançar</th>
                      <th className="p-2.5">Frequência Esperada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-900/20 font-mono">
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">1.50x</td>
                      <td className="p-2 text-emerald-400">64.7%</td>
                      <td className="p-2 text-slate-400">~2 em cada 3 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">2.00x</td>
                      <td className="p-2 text-emerald-400">48.5%</td>
                      <td className="p-2 text-slate-400">~1 em cada 2 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">3.00x</td>
                      <td className="p-2 text-cyan-400">32.3%</td>
                      <td className="p-2 text-slate-400">~1 em cada 3 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">5.00x</td>
                      <td className="p-2 text-cyan-400">19.4%</td>
                      <td className="p-2 text-slate-400">~1 em cada 5 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">10.00x</td>
                      <td className="p-2 text-indigo-400">9.7%</td>
                      <td className="p-2 text-slate-400">~1 em cada 10 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">50.00x</td>
                      <td className="p-2 text-indigo-400">1.94%</td>
                      <td className="p-2 text-slate-400">~1 em cada 51 rodadas</td>
                    </tr>
                    <tr className="hover:bg-blue-900/20">
                      <td className="p-2 font-bold text-white">100.00x</td>
                      <td className="p-2 text-indigo-300 font-bold">0.97%</td>
                      <td className="p-2 text-slate-400">~1 em cada 103 rodadas</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-blue-900/40 text-slate-400 text-[11px] space-y-1">
                <span className="font-semibold text-slate-300 block">Independência Estatística:</span>
                <p>
                  Cada rodada é estritamente independente. Uma sequência de valores baixos (ex: 1.10x, 1.20x) não aumenta nem diminui a chance de sair um multiplicador alto na rodada seguinte.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-blue-900/40 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-cyan-300 font-semibold cursor-pointer transition border border-blue-700/40 text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
