import React from 'react';
import { Text, Stack, Box, Inline, Tooltip, Toggle, Strong } from '@forge/react';

/**
 * Toggle field with label, description, and visual active state
 */
export const ToggleField = ({ label, description, tooltip, isChecked, onChange, disabled = false }) => (
    <Box padding="space.150" xcss={{
        backgroundColor: isChecked ? 'color.background.selected' : 'elevation.surface',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: isChecked ? 'color.border.selected' : 'color.border.neutral',
        transition: 'all 0.15s ease'
    }}>
        <Inline spread="space-between" alignBlock="center">
            <Stack space="space.025">
                <Inline space="space.100" alignBlock="center">
                    <Text><Strong>{label}</Strong></Text>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <Text size="small">ⓘ</Text>
                        </Tooltip>
                    )}
                </Inline>
                {description && <Text size="small">{description}</Text>}
            </Stack>
            <Toggle isChecked={isChecked} onChange={onChange} isDisabled={disabled} />
        </Inline>
    </Box>
);

export default ToggleField;
