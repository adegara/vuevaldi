import {
    ValidationError,
    type ObjectSchema,
    type InferType,
    type ValidateOptions,
} from 'yup';
import type { PartialDeep } from 'type-fest';
import type { Recordable, FormValidator } from '@/types.ts';

const defaultOptions: ValidateOptions = {
    strict: false,
    abortEarly: false,
    stripUnknown: false,
    recursive: true,
    disableStackTrace: true,
};

export function transformYupValidationError(error: ValidationError): Recordable<string[]> {
    const result = {} as Recordable<string[]>;

    if (!error.inner.length && error.errors.length && error.path) {
        result[error.path] = error.errors;
    }

    if (error.inner.length) {
        error.inner.forEach(err => {
            for (const [key, val] of Object.entries(transformYupValidationError(err))) {
                result[key] ||= [] as string[];

                result[key].push(...val);
            }
        });
    }

    return result;
}

export function useYupValidator<
    TFields extends Recordable = Recordable,
>(
    yupSchema: ObjectSchema<TFields>,
    options?: ValidateOptions,
): FormValidator<TFields> {
    options = {
        ...defaultOptions,
        ...(options ?? {}),
    };

    async function isValid(values: PartialDeep<TFields>) {
        return yupSchema.validate(values, options)
            .then(() => true)
            .catch(err => {
                if (!ValidationError.isError(err)) {
                    throw err;
                }

                return false;
            });
    }

    async function parse(values: PartialDeep<TFields>) {
        return yupSchema.validate(values, options)
            .then((output: InferType<ObjectSchema<TFields>>) => ({
                isError: false as const,
                values: output as TFields,
                errors: undefined,
            }))
            .catch(err => {
                if (!ValidationError.isError(err)) {
                    throw err;
                }

                return {
                    isError: true as const,
                    values: undefined,
                    errors: transformYupValidationError(err),
                };
            });
    }

    return {
        isValid,
        parse,
    };
}
