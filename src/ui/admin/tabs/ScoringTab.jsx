import React from 'react';
import { Text, Stack, Box, Textfield, Strong, Inline } from '@forge/react';
import { SectionHeader, FieldGroup } from '../components';

/**
 * Scoring Tab - Impact calculation settings
 */
export const ScoringTab = ({ config, updateConfig, notLinkedWarning }) => {
    return (
        <Stack space="space.150">
            <SectionHeader section="scoring" />
            {notLinkedWarning}

            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '8px'
                }}
            >
                <Stack space="space.150">
                    <Text size="small"><Strong>Example Calculation:</Strong></Text>
                    <Text size="small">
                        Base ({config?.scoring?.basePoints || 10}) + Story Points (3) × Multiplier ({config?.scoring?.storyPointMultiplier || 5})
                        = <Strong>{(config?.scoring?.basePoints || 10) + (3 * (config?.scoring?.storyPointMultiplier || 5))} Leaves</Strong>
                    </Text>
                </Stack>
            </Box>

            <Inline space="space.200">
                <FieldGroup
                    label="Base Points"
                    tooltip="Points awarded for every completed issue, regardless of size. Ensures all work is recognized."
                >
                    <Box xcss={{ width: '120px' }}>
                        <Textfield
                            type="number"
                            min="0"
                            value={String(config?.scoring?.basePoints || 10)}
                            onChange={(e) => updateConfig('scoring.basePoints', parseInt(e.target.value))}
                        />
                    </Box>
                </FieldGroup>
                <FieldGroup
                    label="Story Point Multiplier"
                    tooltip="Points per story point. Higher values reward complex work more."
                >
                    <Box xcss={{ width: '120px' }}>
                        <Textfield
                            type="number"
                            min="0"
                            value={String(config?.scoring?.storyPointMultiplier || 5)}
                            onChange={(e) => updateConfig('scoring.storyPointMultiplier', parseInt(e.target.value))}
                        />
                    </Box>
                </FieldGroup>
            </Inline>

            <Box
                padding="space.150"
                xcss={{
                    backgroundColor: 'color.background.warning.subtle',
                    borderRadius: '8px',
                    marginTop: '8px'
                }}
            >
                <Stack space="space.100">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="small">⚠️</Text>
                        <Text size="small"><Strong>Anti-Gaming Caps</Strong></Text>
                    </Inline>
                    <Text size="small">Set maximum thresholds to prevent abuse and ensure fair contribution tracking.</Text>
                </Stack>
            </Box>

            <Inline space="space.200">
                <FieldGroup
                    label="Max Points per Issue"
                    tooltip="Maximum points any single issue can earn. Prevents outliers from skewing metrics."
                >
                    <Box xcss={{ width: '120px' }}>
                        <Textfield
                            type="number"
                            min="0"
                            value={String(config?.scoring?.caps?.perIssueMax || 200)}
                            onChange={(e) => updateConfig('scoring.caps.perIssueMax', parseInt(e.target.value))}
                        />
                    </Box>
                </FieldGroup>
                <FieldGroup
                    label="Max Points per User/Day"
                    tooltip="Maximum points any user can earn in a single day. Prevents bulk-closing issues for points."
                >
                    <Box xcss={{ width: '120px' }}>
                        <Textfield
                            type="number"
                            min="0"
                            value={String(config?.scoring?.caps?.perUserPerDay || 200)}
                            onChange={(e) => updateConfig('scoring.caps.perUserPerDay', parseInt(e.target.value))}
                        />
                    </Box>
                </FieldGroup>
            </Inline>
        </Stack>
    );
};

export default ScoringTab;
