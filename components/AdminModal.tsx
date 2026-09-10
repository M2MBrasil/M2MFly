'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Lock,
  MessageCircle,
  Clock,
  RefreshCw,
  Coins,
  Send,
} from 'lucide-react';
import {
  RechargeCode,
  getRechargeCodes,
  createRechargeCode,
  deleteRechargeCode,
} from '@/lib/rechargeCodes';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateBalanceDirect?: (newBalance: number) => void;
  onOpenProvablyFair?: () => void;
  onAdminAuthenticated?: () => void;
  currentBalance: number;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onUpdateBalanceDirect,
  onOpenProvablyFair,
  onAdminAuthenticated,
  currentBalance,
}) => {
  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin codes state
  const [codes, setCodes] = useState<RechargeCode[]>([]);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [adminManualBalance, setAdminManualBalance] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setCodes(getRechargeCodes());
      setAuthError(null);
      setAdminPinInput('');
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Restricted Master PIN: 1357
    const pin = adminPinInput.trim();
    if (pin === '1357') {
      setIsAuthenticated(true);
      setAuthError(null);
      setCodes(getRechargeCodes());
      onAdminAuthenticated?.();
    } else {
      setAuthError('Código de acesso incorreto. Verifique e tente novamente.');
    }
  };

  const handleGenerateRandom = () => {
    const newEntry = createRechargeCode();
    setCodes(getRechargeCodes());
    setLastGenerated(newEntry.code);
    navigator.clipboard.writeText(newEntry.code);
    setCopiedCode(newEntry.code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(customInput.trim())) {
      alert('O código personalizado deve conter exatamente 4 dígitos numéricos.');
      return;
    }
    const newEntry = createRechargeCode(customInput.trim());
    setCodes(getRechargeCodes());
    setLastGenerated(newEntry.code);
    setCustomInput('');
  };

  const handleDelete = (code: string) => {
    deleteRechargeCode(code);
    setCodes(getRechargeCodes());
    if (lastGenerated === code) {
      setLastGenerated(null);
    }
  };

  const copyCodeOnly = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyCustomerMessage = (code: string) => {
    const msg = `Olá! Segue seu código de recarga de R$ 500,00 para o M2MFly: *${code}*.\nInsira esse código no jogo para liberar seu saldo e continuar jogando!`;
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const getWhatsAppShareUrl = (code: string) => {
    const text = encodeURIComponent(
      `Olá! Segue seu código de recarga de R$ 500,00 para o M2MFly: *${code}*.\nInsira o código de 4 dígitos no jogo para liberar seus créditos virtuais.`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const handleSetBalance = () => {
    const val = parseFloat(adminManualBalance);
    if (!isNaN(val) && onUpdateBalanceDirect) {
      onUpdateBalanceDirect(Math.max(0, val));
      setAdminManualBalance('');
    }
  };

  const activeCodes = codes.filter((c) => !c.used);
  const usedCodes = codes.filter((c) => c.used);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 border border-blue-600/60 rounded-2xl shadow-[0_0_60px_rgba(14,165,233,0.35)] overflow-hidden">
        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-blue-800/60 flex items-center justify-between shrink-0 bg-gradient-to-r from-blue-950/90 via-slate-900/90 to-blue-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Painel do Administrador
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-cyan-300 border border-blue-700">
                  Gerenciador de Recargas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gere e envie códigos de 4 dígitos para recarga de R$ 500,00
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && onOpenProvablyFair && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProvablyFair();
                }}
                id="admin-btn-open-pf"
                title="Abrir Auditoria Provably Fair das Rodadas"
                className="px-3 py-1.5 rounded-xl bg-blue-900/80 hover:bg-blue-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Provably Fair</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!isAuthenticated ? (
            /* PIN Gate for Admin Authentication */
            <div className="max-w-md mx-auto py-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-900/20 border border-blue-700/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Área Restrita do Administrador</h3>
              <p className="text-xs text-slate-400 mb-5">
                Digite o PIN mestre de acesso para gerenciar os códigos de recarga.
              </p>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="Digite a senha de 4 dígitos"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    autoFocus
                    className="w-full text-center tracking-widest text-lg font-mono px-4 py-3.5 rounded-xl bg-slate-950/90 border border-blue-700/60 text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition shadow-inner"
                  />
                  {authError && (
                    <p className="text-xs text-red-400 mt-2 font-medium">{authError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white transition shadow-[0_0_25px_rgba(6,182,212,0.35)] cursor-pointer"
                >
                  Entrar no Painel Admin
                </button>
              </form>
            </div>
          ) : (
            /* Authenticated Admin Dashboard */
            <>
              {/* Highlight Box: Generate New Code */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
                      Ação Rápida de Administrador
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Gerar Novo Código de 4 Dígitos (+R$ 500)
                    </h3>
                    <p className="text-xs text-slate-300">
                      Gera um código aleatório exclusivo e copia automaticamente para a área de transferência.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateRandom}
                    className="py-3 px-5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Gerar Código
                  </button>
                </div>

                {/* Display Newly Generated or Active Code */}
                {lastGenerated && (
                  <div className="mt-4 pt-4 border-t border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">Código Gerado:</span>
                      <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                        {lastGenerated}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Pronto para Envio
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCodeOnly(lastGenerated)}
                        className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-cyan-300 border border-blue-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedCode === lastGenerated ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => copyCustomerMessage(lastGenerated)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedMessage ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Texto Copiado!
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-cyan-400" />
                            Copiar Mensagem
                          </>
                        )}
                      </button>

                      <a
                        href={getWhatsAppShareUrl(lastGenerated)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 transition cursor-pointer"
                        title="Enviar via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Create Custom 4-digit Code */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Criar Código Personalizado
                </h4>
                <form onSubmit={handleCreateCustom} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Ex: 7777 ou 1234"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, ''))}
                    className="w-36 font-mono text-center tracking-widest text-sm font-bold px-3 py-2 rounded-xl bg-slate-950 border border-blue-800/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={customInput.length !== 4}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      customInput.length === 4
                        ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Salvar Código
                  </button>
                </form>
              </div>

              {/* ACTIVE (AVAILABLE) CODES LIST */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    Códigos Disponíveis para Clientes ({activeCodes.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Cada código recarrega +R$ 500,00 uma única vez
                  </span>
                </div>

                {activeCodes.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-900/40 border border-blue-950 text-center text-xs text-slate-400">
                    Nenhum código ativo no momento. Clique em &quot;Gerar Código&quot; acima para criar um.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeCodes.map((item) => (
                      <div
                        key={item.code}
                        className="p-3 rounded-xl bg-slate-900/90 border border-blue-900/60 flex items-center justify-between gap-3 hover:border-cyan-500/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xl font-black text-cyan-300 tracking-wider">
                            {item.code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                            Disponível (+R$ {item.amount.toFixed(2)})
                          </span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyCodeOnly(item.code)}
                            title="Copiar código de 4 dígitos"
                            className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-cyan-300 border border-blue-800 text-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            {copiedCode === item.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Copiar</span>
                          </button>

                          <button
                            onClick={() => copyCustomerMessage(item.code)}
                            title="Copiar mensagem completa para envio"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="hidden sm:inline">Mensagem</span>
                          </button>

                          <a
                            href={getWhatsAppShareUrl(item.code)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 transition cursor-pointer"
                            title="Enviar direto no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleDelete(item.code)}
                            title="Excluir código"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* USED CODES LIST */}
              {usedCodes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Códigos Já Utilizados ({usedCodes.length})
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {usedCodes.map((item) => (
                      <div
                        key={item.code}
                        className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400 opacity-70"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono line-through font-bold text-slate-400">
                            {item.code}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            Utilizado
                          </span>
                          {item.usedAt && (
                            <span className="text-[10px] text-slate-500">
                              às {new Date(item.usedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(item.code)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADMIN BALANCE OVERRIDE */}
              {onUpdateBalanceDirect && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white">Saldo Atual em Jogo: </span>
                      <span className="font-mono text-cyan-300 font-bold">R$ {currentBalance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Novo saldo (R$)"
                      value={adminManualBalance}
                      onChange={(e) => setAdminManualBalance(e.target.value)}
                      className="w-32 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-blue-800 text-white"
                    />
                    <button
                      onClick={handleSetBalance}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-cyan-200 transition cursor-pointer"
                    >
                      Ajustar
                    </button>
                  </div>
                </div>
              )}

              {/* PROVABLY FAIR AUDIT TOOL (EXCLUSIVE FOR ADMIN) */}
              {onOpenProvablyFair && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-indigo-950/60 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        Auditoria Técnica Provably Fair
                        <span className="text-[10px] px-2 py-0.2 rounded bg-blue-900/80 text-cyan-300 border border-blue-700">
                          Exclusivo Admin
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Acesso às sementes criptográficas (Server Seed, Client Seed) e cálculo de multiplicação SHA-256 de todas as rodadas.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenProvablyFair();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Abrir Auditoria
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
