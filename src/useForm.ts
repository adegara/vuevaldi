import { ref, computed, watch, type Ref } from 'vue';
import { cloneDeep, difference, get, isEqual, keys, omit, pick, set, uniq } from 'lodash';
import { flattenObject, unflattenObject } from '@adegara/js-utils';
import { transformViolations } from '@/violations.ts';
import type { PartialDeep } from 'type-fest';
import type {
    Recordable,
    ValidationErrors,
    FormContext,
    FormContextOptions,
    FlattenedErrors,
} from '@/types';

function sortObjectByKey<T extends Recordable = Recordable>(obj: T): T {
    return Object.keys(obj).sort().reduce((result, key: keyof T) => {
        result[key] = obj[key];

        return result;
    }, {} as T);
}

export function useForm<
    TFields extends Recordable = Recordable,
    TResp = unknown,
    TErr = unknown,
>(
    opt: FormContextOptions<TFields, TResp, TErr>,
): FormContext<TFields, TResp, TErr> {
    const model = ref(cloneDeep(opt.values ?? opt.defaultValues ?? {})) as Ref<PartialDeep<TFields>>;
    const error = ref('');
    const errors = ref({}) as Ref<ValidationErrors<TFields>>;
    const rawErrors = ref({}) as Ref<FlattenedErrors>;
    const isSubmitting = ref(false);
    const updatedFieldPaths = ref<string[]>([]);
    let violations = {} as FlattenedErrors;
    let submitFailed = false;

    if (opt.validateOnInput) {
        watch(
            () => cloneDeep(model.value),
            (newState, oldState) => {
                const flattenedNewState = flattenObject(newState);
                const flattenedOldState = flattenObject(oldState);

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

    function setErrors(flErrors: FlattenedErrors) {
        const newRawErrors: FlattenedErrors = cloneDeep(flErrors);

        for (const [key, val] of Object.entries(violations)) {
            newRawErrors[key] ||= [] as string[];

            newRawErrors[key].push(...val);
        }

        const newFlErrors: FlattenedErrors = !opt.validateOnInput || submitFailed
            ? cloneDeep(newRawErrors)
            : pick(cloneDeep(newRawErrors), updatedFieldPaths.value);
        const newErrors = unflattenObject<ValidationErrors<TFields>>(
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
        const result = await opt.validator.parse(model.value);

        if (isSubmitting.value && result.isError) {
            submitFailed = true;
        }

        setErrors(result.errors ?? {});

        return result.isError
            ? false
            : result.values;
    }

    // TODO: make it public?
    function updateOptions(
        newOpt: Partial<Omit<typeof opt, 'values'>>,
    ) {
        const fields: (keyof typeof newOpt)[] = [
            'defaultValues',
            'events',
            'submitHandler',
            'errorHandler',
            'resetAfterSubmit',
            'validateOnInput',
            'validator',
        ];

        fields.forEach(key => {
            set(opt, key, get(newOpt, key) ?? get(opt, key));
        });
    }

    function reset(
        newOpt?: Partial<Pick<typeof opt, 'values' | 'defaultValues'>>,
    ) {
        newOpt && updateOptions(newOpt);

        error.value = '';
        errors.value = {} as ValidationErrors<TFields>;
        rawErrors.value = {};
        updatedFieldPaths.value = [];
        isSubmitting.value = false;
        violations = {};
        submitFailed = false;

        model.value = cloneDeep(newOpt?.values ?? opt.defaultValues ?? {}) as PartialDeep<TFields>;
    }

    async function submit() {
        isSubmitting.value = true;
        error.value = '';

        const values = await validate();

        if (!values) {
            isSubmitting.value = false;

            return;
        }

        await opt.submitHandler(values)
            .then(r => {
                submitFailed = false;

                opt.resetAfterSubmit && reset();
                opt.events?.onSuccess && opt.events.onSuccess(r);
            })
            .catch((e: TErr) => {
                submitFailed = true;

                if (opt.errorHandler) {
                    const newError = opt.errorHandler(e);

                    violations = newError.violations ? transformViolations(newError.violations) : {};
                    error.value = newError.message;
                    errors.value = unflattenObject(violations);
                    rawErrors.value = violations;
                } else if (e instanceof Error) {
                    error.value = e.message;
                }

                opt.events?.onError && opt.events.onError(e);
            })
            .finally(() => {
                opt.events?.onFinished && opt.events.onFinished();
                isSubmitting.value = false;
            });
    }

    return {
        model,
        error: computed(() => error.value),
        errors: computed(() => errors.value),
        rawErrors: computed(() => rawErrors.value),
        isSubmitting: computed(() => isSubmitting.value),
        submit,
        reset,
        validate,
        options: opt,
    };
}
