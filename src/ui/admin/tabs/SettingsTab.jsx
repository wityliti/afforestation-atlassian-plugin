import React from 'react';
import { Text, Stack, Box, Textfield, Select, Strong, Inline, Lozenge } from '@forge/react';
import { SectionHeader, FieldGroup, ToggleField } from '../components';

/**
 * Settings Tab - Organization settings
 */
export const SettingsTab = ({ config, updateConfig, notLinkedWarning }) => {
    return (
        <Stack space="space.150">
            <SectionHeader section="settings" />
            {notLinkedWarning}

            {/* Conversion Settings */}
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'color.border.neutral'
                }}
            >
                <Stack space="space.150">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="large">🌲</Text>
                        <Strong>Tree Conversion</Strong>
                    </Inline>
                    <FieldGroup
                        label="Leaves per Tree"
                        tooltip="Number of Leaves required to plant one tree. Lower values create more frequent milestones."
                    >
                        <Inline space="space.100" alignBlock="center">
                            <Box xcss={{ width: '120px' }}>
                                <Textfield
                                    type="number"
                                    min="1"
                                    value={String(config?.plantingMode?.conversion?.leavesPerTree || 100)}
                                    onChange={(e) => updateConfig('plantingMode.conversion.leavesPerTree', parseInt(e.target.value))}
                                />
                            </Box>
                            <Lozenge>1 Tree = {config?.plantingMode?.conversion?.leavesPerTree || 100} Leaves</Lozenge>
                        </Inline>
                    </FieldGroup>
                </Stack>
            </Box>

            {/* Execution Mode */}
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'color.border.neutral'
                }}
            >
                <Stack space="space.150">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="large">⚡</Text>
                        <Strong>Execution Mode</Strong>
                    </Inline>
                    <Text size="small">Choose how tree planting is triggered:</Text>
                    <Stack space="space.100">
                        <ToggleField
                            label="Instant Planting"
                            description="Trees are planted immediately when thresholds are reached"
                            isChecked={config?.plantingMode?.instantEnabled}
                            onChange={(e) => updateConfig('plantingMode.instantEnabled', e.target.checked)}
                        />
                        <ToggleField
                            label="Weekly Pledge Batching"
                            description="Accumulate impact and batch plant weekly"
                            isChecked={config?.plantingMode?.pledgeEnabled}
                            onChange={(e) => updateConfig('plantingMode.pledgeEnabled', e.target.checked)}
                        />
                    </Stack>
                </Stack>
            </Box>

            {/* Privacy Settings */}
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'elevation.surface.raised',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'color.border.neutral'
                }}
            >
                <Stack space="space.150">
                    <Inline space="space.100" alignBlock="center">
                        <Text size="large">🔒</Text>
                        <Strong>Privacy & Leaderboards</Strong>
                    </Inline>
                    <FieldGroup
                        label="Leaderboard Visibility"
                        tooltip="Controls who can see contribution leaderboards."
                    >
                        <Select
                            options={[
                                { label: 'Organization Wide — All users can see the leaderboard', value: 'ORG_WIDE' },
                                { label: 'Team Only — Users see only their team\'s leaderboard', value: 'TEAM_ONLY' },
                                { label: 'Disabled — No leaderboards shown', value: 'DISABLED' }
                            ]}
                            value={{
                                label: config?.privacy?.leaderboardMode === 'ORG_WIDE' ? 'Organization Wide' :
                                    config?.privacy?.leaderboardMode === 'TEAM_ONLY' ? 'Team Only' : 'Disabled',
                                value: config?.privacy?.leaderboardMode || 'TEAM_ONLY'
                            }}
                            onChange={(opt) => updateConfig('privacy.leaderboardMode', opt.value)}
                        />
                    </FieldGroup>
                    <ToggleField
                        label="Require User Opt-In"
                        description="Users must consent before appearing on leaderboards"
                        isChecked={config?.privacy?.userOptInRequired}
                        onChange={(e) => updateConfig('privacy.userOptInRequired', e.target.checked)}
                    />
                </Stack>
            </Box>
        </Stack>
    );
};

export default SettingsTab;
