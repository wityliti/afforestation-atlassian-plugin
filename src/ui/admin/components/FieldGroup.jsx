import React from 'react';
import { Text, Stack, Inline, Tooltip, Strong } from '@forge/react';

/**
 * Form field wrapper with label, tooltip, and required indicator
 */
export const FieldGroup = ({ label, tooltip, children, required = false }) => (
    <Stack space="space.050">
        <Inline space="space.100" alignBlock="center">
            <Text size="small">
                <Strong>{label}</Strong>
                {required && <Text size="small" color="color.text.danger"> *</Text>}
            </Text>
            {tooltip && (
                <Tooltip content={tooltip}>
                    <Text size="small">ⓘ</Text>
                </Tooltip>
            )}
        </Inline>
        {children}
    </Stack>
);

export default FieldGroup;
