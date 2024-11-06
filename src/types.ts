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

export interface SimpleFormContextOptions<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
    TExtraData = never,
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

export type FormContextOptions<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
    TExtraData = never,
> =
    SimpleFormContextOptions<TFields, TResp, TErr, TExtraData>
    & (
        [TExtraData] extends [never]
            ? { extraData?: TExtraData }
            : { extraData: TExtraData }
    );

export interface FormContext<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
    TExtraData = never,
    TOpt extends SimpleFormContextOptions<TFields, TResp, TErr, TExtraData> = SimpleFormContextOptions<
        TFields,
        TResp,
        TErr,
        TExtraData
    >,
> {
    model: Ref<PartialDeep<TFields>>;
    error: ComputedRef<string>;
    errors: ComputedRef<ValidationErrors<TFields>>;
    isSubmitting: ComputedRef<boolean>;
    submit: () => Promise<void>;
    reset: (newOpt?: Partial<Pick<TOpt, 'values' | 'defaultValues'>>) => void;
    validate: () => Promise<false | TFields>;
    addEventListener: AddEventListenerType<TResp, TErr>;
    getExtraData: () => TExtraData;
}

export interface FormValidator<TFields extends Recordable = Recordable> {
    isValid: (values: PartialDeep<TFields>) => Promise<boolean>;
    parse: (values: PartialDeep<TFields>) => Promise<
        { isError: false; values: TFields; errors: undefined } |
        { isError: true; values: undefined; errors: FlattenedErrors }
    >;
}
