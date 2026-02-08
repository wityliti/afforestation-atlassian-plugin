import React from 'react';
import { Text, Stack, Box, Textfield, Strong, Inline, Lozenge } from '@forge/react';
import { SectionHeader, FieldGroup, ToggleField } from '../components';

/**
 * Completion Tab - Detection settings
 */
export const CompletionTab = ({ config, updateConfig, notLinkedWarning }) => {
    return (
        <Stack space="space.200">
            <SectionHeader section="completion" />
            {notLinkedWarning}

            <ToggleField
                label="Match by Status Category"
                description="Matches any status in the 'Done' category (Done, Resolved, Closed, etc.)"
                tooltip="This includes all custom statuses you've added to the Done category. Recommended for most workflows."
                isChecked={config?.completion?.statusCategory?.enabled}
                onChange={(e) => updateConfig('completion.statusCategory.enabled', e.target.checked)}
            />

            <ToggleField
                label="Match by Exact Status Name"
                description="Use for custom completion statuses not in the Done category"
                tooltip="Enable this if you have specific status names that indicate completion."
                isChecked={config?.completion?.statusName?.enabled}
                onChange={(e) => updateConfig('completion.statusName.enabled', e.target.checked)}
            />

            {config?.completion?.statusName?.enabled && (
                <Box padding="space.150" xcss={{
                    marginLeft: '24px',
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '8px',
                    borderLeft: '3px solid',
                    borderLeftColor: 'color.border.brand'
                }}>
                    <FieldGroup
                        label="Done Status Names"
                        tooltip="Enter status names separated by commas. Issues with any of these statuses will be counted as complete."
                    >
                        <Textfield
                            placeholder="Done, Resolved, Closed, Shipped"
                            value={config?.completion?.statusName?.doneStatusNames?.join(', ') || ''}
                            onChange={(e) => updateConfig('completion.statusName.doneStatusNames', e.target.value.split(',').map(s => s.trim()))}
                        />
                    </FieldGroup>
                </Box>
            )}

            <Box padding="space.200" xcss={{
                backgroundColor: 'elevation.surface.raised',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'color.border.neutral'
            }}>
                <Stack space="space.150">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="large">🔄</Text>
                        <Strong>Reopen Policy</Strong>
                    </Inline>
                    <FieldGroup
                        label="Reopen Multiplier"
                        tooltip="Controls points awarded when an issue is completed again after being reopened."
                    >
                        <Inline space="space.100" alignBlock="center">
                            <Box xcss={{ width: '100px' }}>
                                <Textfield
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={String(config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5)}
                                    onChange={(e) => updateConfig('completion.reopenPolicy.reawardMultiplier', parseFloat(e.target.value))}
                                />
                            </Box>
                            <Lozenge appearance={
                                (config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5) === 0 ? 'removed' :
                                    (config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5) < 1 ? 'moved' : 'success'
                            }>
                                {(config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5) === 0 ? 'No re-award' :
                                    (config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5) === 1 ? 'Full points' :
                                        `${((config?.completion?.reopenPolicy?.reawardMultiplier ?? 0.5) * 100).toFixed(0)}% points`}
                            </Lozenge>
                        </Inline>
                    </FieldGroup>
                </Stack>
            </Box>
        </Stack>
    );
};

export default CompletionTab;
