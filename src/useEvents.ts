import type { AddEventListenerType, EventListeners, EventListenerTrigger } from '@/types.ts';

export function useEvents<TResp, TErr>() {
    const listeners: EventListeners<TResp, TErr> = {
        success: [],
        error: [],
        finished: [],
    };

    const addListener: AddEventListenerType<TResp, TErr> = (event, listener) => {
        listeners[event].push(listener as never);
    };

    const trigger: EventListenerTrigger<TResp, TErr> = (event, ...args) => {
        for (const listener of listeners[event]) {
            (listener as (...p: unknown[]) => void)(...args);
        }
    };

    return {
        addListener,
        trigger,
    };
}
