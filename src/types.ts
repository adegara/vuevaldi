import type { ComputedRef, Ref } from 'vue';
import type { PartialDeep, Primitive } from 'type-fest';

export type Recordable<T = unknown> = Record<string, T>;

type NonRecursiveType =
    | Primitive
    | void
    | Date
    | RegExp
    | ((...args: unknown[]) => unknown)
    | (new (...args: unknown[]) => unknown)
    | Map<unknown, unknown>
    | Set<unknown>
    | ReadonlyMap<unknown, unknown>
    | ReadonlySet<unknown>;

type Schema<TObject, TValue> = TObject extends NonRecursiveType
    ? TValue
    : TObject extends object | unknown[]
        ? { [TKey in keyof TObject]: Schema<TObject[TKey], TValue> }
        : TValue;

export type FlattenedErrors = Recordable<string[]>;
export type ValidationErrors<T> = Schema<T, string[] | undefined>;

export interface EventListeners<TResp, TErr> {
    success: ((data: TResp) => void)[];
    error: ((error: TErr) => void)[];
    finished: (() => void)[];
}

export type AddEventListenerType<TResp, TErr> = <K extends keyof EventListeners<TResp, TErr>>(
    event: K,
    listener: EventListeners<TResp, TErr>[K][number]
) => void;

export type EventListenerTrigger<TResp, TErr> = <K extends keyof EventListeners<TResp, TErr>>(
    key: K,
    ...args: Parameters<EventListeners<TResp, TErr>[K][number]>
) => void;

export interface FormContextOptions<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
    TExtraData extends Recordable = never,
> {
    values?: PartialDeep<TFields>;
    defaultValues?: PartialDeep<TFields>;
    extraData?: TExtraData;
    submitHandler: (values: TFields) => Promise<TResp>;
    errorHandler?: (error: TErr) => {
        message: string;
        violations?: {
            message: string;
            propertyPath: string;
        }[];
    };
    resetAfterSubmit?: boolean;
    validateOnInput?: boolean;
    validator: FormValidator<TFields>;
}

export interface FormContext<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
    TExtraData extends Recordable = never,
    TErrs extends Recordable = ValidationErrors<TFields>,
    TOpt extends FormContextOptions<TFields, TResp, TErr, TExtraData> = FormContextOptions<
        TFields,
        TResp,
        TErr,
        TExtraData
    >,
> {
    model: Ref<PartialDeep<TFields>>;
    error: ComputedRef<string>;
    errors: ComputedRef<TErrs>;
    isSubmitting: ComputedRef<boolean>;
    submit: (throwError?: boolean) => Promise<boolean>;
    reset: (newOpt?: Partial<Pick<TOpt, 'values' | 'defaultValues'>>) => void;
    validate: () => Promise<false | TFields>;
    addEventListener: AddEventListenerType<TResp, TErr>;
    getExtraData: () => TExtraData;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AnyFormContext {
    model: Ref<Recordable>;
    error: ComputedRef<string>;
    errors: ComputedRef<Recordable>;
    isSubmitting: ComputedRef<boolean>;
    submit: (throwError?: boolean) => Promise<boolean>;
    reset: (...args: any[]) => void;
    validate: () => Promise<false | Recordable>;
    addEventListener: AddEventListenerType<any, any>;
    getExtraData?: () => Recordable;
}
/* eslint-enable */

export interface FormValidator<TFields extends Recordable = Recordable> {
    isValid: (values: PartialDeep<TFields>) => Promise<boolean>;
    parse: (values: PartialDeep<TFields>) => Promise<
        { isError: false; values: TFields; errors: undefined } |
        { isError: true; values: undefined; errors: FlattenedErrors }
    >;
}
