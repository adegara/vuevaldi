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

export interface FormContextOptions<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
> {
    values?: PartialDeep<TFields>;
    defaultValues?: PartialDeep<TFields>;
    events?: {
        onSuccess?: (response: TResp) => void;
        onError?: (e: TErr) => void;
        onFinished?: () => void;
    };
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
    TOpt extends FormContextOptions<TFields, TResp, TErr> = FormContextOptions<TFields, TResp, TErr>,
> {
    model: Ref<PartialDeep<TFields>>;
    error: ComputedRef<string>;
    errors: ComputedRef<ValidationErrors<TFields>>;
    rawErrors: ComputedRef<FlattenedErrors>;
    isSubmitting: ComputedRef<boolean>;
    submit: () => Promise<void>;
    reset: (newOpt?: Partial<Pick<TOpt, 'values' | 'defaultValues'>>) => void;
    validate: () => Promise<false | TFields>;
    options: TOpt;
}

export interface FormValidator<TFields extends Recordable = Recordable> {
    isValid: (values: PartialDeep<TFields>) => Promise<boolean>;
    parse: (values: PartialDeep<TFields>) => Promise<
        { isError: false; values: TFields; errors: undefined } |
        { isError: true; values: undefined; errors: FlattenedErrors }
    >;
}
