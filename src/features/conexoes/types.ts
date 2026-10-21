export type ConexaoRelacao = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED';

export type MeuQrConexao = { payload: string; imageData: string };

export type PerfilConexao = {
  nome: string;
  foto: string | null;
  relacao: ConexaoRelacao;
  solicitacaoId: number | null;
};

export type SolicitacaoConexao = {
  id: number;
  nome: string;
  foto: string | null;
  eventoId: number;
  eventoNome: string;
  criadaEm: string;
};

export type ConexaoConfirmada = {
  id: number;
  nome: string;
  foto: string | null;
  eventoId: number;
  eventoNome: string;
  conectadaEm: string | null;
  xp: number;
};

export type ResumoConexoes = {
  recebidas: SolicitacaoConexao[];
  enviadas: SolicitacaoConexao[];
  conexoes: ConexaoConfirmada[];
};

export type ResultadoConexao = { id: number; status: string; xp: number; message: string };