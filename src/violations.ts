import { isArray, isObject, isString } from 'lodash';
import type { FlattenedErrors } from '@/types.ts';

interface Violation {
    message: string;
    propertyPath: string;
}

export function transformViolations(violations: Violation[]): FlattenedErrors {
    const result = {} as FlattenedErrors;

    if (!isArray(violations)) {
        return result;
    }

    violations.forEach(violation => {
        if (
            !isObject(violation)
            || !('propertyPath' in violation)
            || !('message' in violation)
            || !isString(violation.propertyPath)
            || !isString(violation.message)
        ) {
            return;
        }

        result[violation.propertyPath] ||= [];

        result[violation.propertyPath].push(violation.message);
    });

    return result;
}
