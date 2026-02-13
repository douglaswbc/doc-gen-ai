// src/hooks/useAutoSave.ts

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
    /** Chave única para identificar os dados no localStorage */
    key: string;
    /** Dados a serem salvos */
    data: T;
    /** Intervalo de auto-save em milissegundos (padrão: 30 segundos) */
    interval?: number;
    /** Callback quando dados são restaurados */
    onRestore?: (data: T) => void;
    /** Se o auto-save está habilitado */
    enabled?: boolean;
}

/**
 * Hook para auto-save de dados em localStorage
 * Salva automaticamente a cada intervalo e restaura ao montar
 */
export function useAutoSave<T>({
    key,
    data,
    interval = 30000,
    onRestore,
    enabled = true
}: UseAutoSaveOptions<T>) {
    const lastSavedRef = useRef<string>('');
    const hasRestoredRef = useRef(false);

    // Salvar dados
    const save = useCallback(() => {
        if (!enabled) return;

        const serialized = JSON.stringify(data);
        if (serialized !== lastSavedRef.current) {
            localStorage.setItem(key, serialized);
            localStorage.setItem(`${key}_timestamp`, new Date().toISOString());
            lastSavedRef.current = serialized;
            console.log(`[AutoSave] Dados salvos: ${key}`);
        }
    }, [key, data, enabled]);

    // Limpar dados salvos
    const clear = useCallback(() => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
        lastSavedRef.current = '';
        console.log(`[AutoSave] Dados limpos: ${key}`);
    }, [key]);

    // Restaurar dados ao montar (apenas uma vez)
    useEffect(() => {
        if (!enabled || hasRestoredRef.current) return;

        const saved = localStorage.getItem(key);
        const timestamp = localStorage.getItem(`${key}_timestamp`);

        if (saved && timestamp) {
            const savedDate = new Date(timestamp);
            const now = new Date();
            const hoursDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);

            // Só restaura se os dados foram salvos nas últimas 24 horas
            if (hoursDiff < 24) {
                try {
                    const parsed = JSON.parse(saved) as T;
                    onRestore?.(parsed);
                    console.log(`[AutoSave] Dados restaurados: ${key} (salvos há ${hoursDiff.toFixed(1)}h)`);
                } catch (e) {
                    console.error('[AutoSave] Erro ao restaurar dados:', e);
                    clear();
                }
            } else {
                // Dados muito antigos, limpar
                clear();
            }
        }

        hasRestoredRef.current = true;
    }, [key, enabled, onRestore, clear]);

    // Auto-save a cada intervalo
    useEffect(() => {
        if (!enabled) return;

        const timer = setInterval(save, interval);
        return () => clearInterval(timer);
    }, [save, interval, enabled]);

    // Salvar ao desmontar
    useEffect(() => {
        return () => {
            if (enabled) save();
        };
    }, [save, enabled]);

    // Aviso ao sair da página
    useEffect(() => {
        if (!enabled) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            save();
            // Só mostra aviso se há dados não vazios
            const serialized = JSON.stringify(data);
            if (serialized !== '{}' && serialized !== '[]' && serialized !== 'null') {
                e.preventDefault();
                e.returnValue = 'Você tem dados não salvos. Deseja sair?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [data, save, enabled]);

    return { save, clear };
}

export default useAutoSave;
