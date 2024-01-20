import { isArray, isObject, isString } from 'lodash';
import type { FlattenedErrorsType } from '@/types.ts';

interface ViolationInterface {
    message: string;
    propertyPath: string;
}

export function transformViolations(violations: ViolationInterface[]): FlattenedErrorsType {
    const result = {} as FlattenedErrorsType;

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
