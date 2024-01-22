import { ref, computed, watch, type Ref } from 'vue';
import { cloneDeep, difference, isEqual, keys, omit, pick, uniq } from 'lodash';
import { flattenObject, unflattenObject } from '@adegara/js-utils';
import { transformViolations } from '@/violations.ts';
import type { PartialDeep } from 'type-fest';
import type {
    Recordable,
    ErrorsType,
    FormContextInterface,
    FormContextOptionsInterface,
    FlattenedErrorsType,
} from '@/types';

function sortObjectByKey<T extends Recordable = Recordable>(obj: T): T {
    return Object.keys(obj).sort().reduce((result, key: keyof T) => {
        result[key] = obj[key];

        return result;
    }, {} as T);
}

export function useForm<
    TFields extends Recordable = Recordable,
    TResponse = unknown,
    TError = unknown,
>(
    options: FormContextOptionsInterface<TFields, TResponse, TError>,
): FormContextInterface<TFields> {
    const {
        eventHandlers,
        submitHandler,
        errorHandler,
        resetAfterSubmit,
        validateOnInput,
        validator,
    } = options;
    const defaultValues = cloneDeep<PartialDeep<TFields>>(options.defaultValues ?? {} as PartialDeep<TFields>);
    const isSubmitting = ref(false);
    const error = ref('');
    const errors = ref({}) as Ref<ErrorsType<TFields>>;
    const rawErrors = ref({}) as Ref<FlattenedErrorsType>;
    const model = ref(cloneDeep(defaultValues)) as Ref<PartialDeep<TFields>>;
    const updatedFieldPaths = ref<string[]>([]);
    let violations = {} as FlattenedErrorsType;
    let submitFailed = false;

    if (validateOnInput) {
        watch(
            () => cloneDeep(model),
            (newState, oldState) => {
                const flattenedNewState = flattenObject(newState.value);
                const flattenedOldState = flattenObject(oldState.value);

                const changedPaths: string[] = [];
                const removedPaths = difference(keys(flattenedOldState), keys(flattenedNewState));

                keys(flattenedNewState).forEach(key => {
                    if (flattenedOldState[key] !== flattenedNewState[key]) {
                        changedPaths.push(key);
                    }
                });

                // Remove updated paths from violations
                violations = omit(violations, removedPaths, changedPaths);

                updatedFieldPaths.value = uniq([
                    ...difference(updatedFieldPaths.value, removedPaths),
                    ...changedPaths,
                ]);

                void validate();
            },
            { deep: true },
        );
    }

    function setErrors(flErrors: FlattenedErrorsType) {
        const newRawErrors: FlattenedErrorsType = cloneDeep(flErrors);

        for (const [key, val] of Object.entries(violations)) {
            newRawErrors[key] ||= [] as string[];

            newRawErrors[key].push(...val);
        }

        const newFlErrors: FlattenedErrorsType = !validateOnInput || submitFailed
            ? cloneDeep(newRawErrors)
            : pick(cloneDeep(newRawErrors), updatedFieldPaths.value);
        const newErrors = unflattenObject<ErrorsType<TFields>>(
            sortObjectByKey(newFlErrors),
        );

        if (!isEqual(newErrors, errors.value)) {
            errors.value = newErrors;
        }

        if (!isEqual(newRawErrors, rawErrors.value)) {
            rawErrors.value = newRawErrors;
        }
    }

    async function validate() {
        const result = await validator.parse(model.value);

        if (isSubmitting.value && result.isError) {
            submitFailed = true;
        }

        setErrors(result.errors ?? {});

        return result.isError
            ? false
            : result.values;
    }

    function handleReset() {
        error.value = '';
        errors.value = {} as ErrorsType<TFields>;
        rawErrors.value = {};
        updatedFieldPaths.value = [];
        model.value = cloneDeep(defaultValues);
        isSubmitting.value = false;
        violations = {};
        submitFailed = false;
    }

    async function handleSubmit() {
        isSubmitting.value = true;
        error.value = '';

        const values = await validate();

        if (!values) {
            isSubmitting.value = false;

            return;
        }

        await submitHandler(values)
            .then(r => {
                submitFailed = false;

                resetAfterSubmit && handleReset();
                eventHandlers?.onSuccess && eventHandlers.onSuccess(r);
            })
            .catch((e: TError) => {
                submitFailed = true;

                if (errorHandler) {
                    const newError = errorHandler(e);

                    violations = newError.violations ? transformViolations(newError.violations) : {};
                    error.value = newError.message;
                    errors.value = unflattenObject(violations);
                    rawErrors.value = violations;
                } else if (e instanceof Error) {
                    error.value = e.message;
                }

                eventHandlers?.onError && eventHandlers.onError(e);
            })
            .finally(() => {
                eventHandlers?.onFinished && eventHandlers.onFinished();
                isSubmitting.value = false;
            });
    }

    return {
        model,
        error: computed(() => error.value),
        errors: computed(() => errors.value),
        rawErrors: computed(() => rawErrors.value),
        isSubmitting: computed(() => isSubmitting.value),
        handleSubmit,
        handleReset,
        validate,
    };
}
