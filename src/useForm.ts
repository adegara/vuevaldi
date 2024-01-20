import { ref, computed, watch, type Ref } from 'vue';
import { cloneDeep, difference, isEqual, keys, omit, pick, uniq } from 'lodash';
import { flattenObject, unflattenObject } from '@adegara/js-utils';
import { transformViolations } from '@/violations.ts';
import type { PartialDeep } from 'type-fest';
import type {
    FormContextInterface,
    FormContextOptionsInterface,
    ErrorsType,
    FlattenedErrorsType, Recordable,
} from '@/types';

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

    function setErrors(flattenedErrors: FlattenedErrorsType) {
        const flattenedNewErrors = !validateOnInput || submitFailed
            ? flattenedErrors
            : pick(flattenedErrors, updatedFieldPaths.value);

        for (const [key, val] of Object.entries(violations)) {
            flattenedNewErrors[key] ||= [] as string[];

            flattenedNewErrors[key].push(...val);
        }

        const newErrors = unflattenObject<ErrorsType<TFields>>(flattenedNewErrors);

        if (!isEqual(newErrors, errors.value)) {
            errors.value = newErrors;
        }
    }

    async function validate() {
        const result = await validator.parse(model.value);

        setErrors(result.errors ?? {});

        return result.isError
            ? false
            : result.values;
    }

    function handleReset() {
        error.value = '';
        errors.value = {} as ErrorsType<TFields>;
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
            submitFailed = true;
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
                // error.value = !e.violations ? e.message : '';

                if (errorHandler) {
                    const newError = errorHandler(e);

                    violations = newError.violations ? transformViolations(newError.violations) : {};
                    error.value = newError.message;
                    errors.value = unflattenObject(violations);
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
        isSubmitting: computed(() => isSubmitting.value),
        handleSubmit,
        handleReset,
        validate,
    };
}
