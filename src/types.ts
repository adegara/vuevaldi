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

export type FlattenedErrorsType = Recordable<string[]>;
export type ErrorsType<T> = Schema<T, string[] | undefined>;

export interface FormContextOptionsInterface<
    TFields extends Recordable = Recordable,
    TResponse = unknown,
    TError = unknown,
> {
    defaultValues?: PartialDeep<TFields>;
    events?: {
        onSuccess?: (response: TResponse) => void;
        onError?: (e: TError) => void;
        onFinished?: () => void;
    };
    submitHandler: (values: TFields) => Promise<TResponse>;
    errorHandler?: (error: TError) => {
        message: string;
        violations?: {
            message: string;
            propertyPath: string;
        }[];
    };
    resetAfterSubmit?: boolean;
    validateOnInput?: boolean;
    validator: FormValidatorInterface<TFields>;
}

export interface FormContextInterface<
    TFields extends Recordable = Recordable,
    TResponse = unknown,
    TError = unknown,
> {
    model: Ref<PartialDeep<TFields>>;
    error: ComputedRef<string>;
    errors: ComputedRef<ErrorsType<TFields>>;
    rawErrors: ComputedRef<FlattenedErrorsType>;
    isSubmitting: ComputedRef<boolean>;
    submit: () => Promise<void>;
    reset: () => void;
    validate: () => Promise<false | TFields>;
    options: FormContextOptionsInterface<TFields, TResponse, TError>;
}

export interface FormValidatorInterface<TFields extends Recordable = Recordable> {
    isValid: (values: PartialDeep<TFields>) => Promise<boolean>;
    parse: (values: PartialDeep<TFields>) => Promise<
        { isError: false; values: TFields; errors: undefined } |
        { isError: true; values: undefined; errors: FlattenedErrorsType }
    >;
}
