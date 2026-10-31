type EventoHome = { hasCheckedIn: boolean; canCheckIn: boolean; status: 'available' | 'upcoming' | 'finished' };

/**
 * Evento que a Home usa para presença, pontos, ranking, votos e quizzes. Todos os cards precisam olhar
 * para o MESMO evento; por isso a escolha é uma só, na ordem:
 * 1) em andamento e com check-in feito (onde o participante está pontuando agora);
 * 2) em andamento;
 * 3) com check-in feito (por exemplo, um evento que acabou de encerrar);
 * 4) o próximo que ainda vai começar;
 * 5) o primeiro da lista.
 */
export function escolherEventoAtivo<T extends EventoHome>(eventos: T[]): T | undefined {
  return eventos.find((e) => e.hasCheckedIn && e.canCheckIn)
    ?? eventos.find((e) => e.canCheckIn)
    ?? eventos.find((e) => e.hasCheckedIn)
    ?? eventos.find((e) => e.status === 'upcoming')
    ?? eventos[0];
}
