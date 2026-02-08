import React from 'react';
import { Text, Stack, Box, Button, Textfield, SectionMessage, Select, ProgressBar, Strong, Inline, Lozenge, Badge } from '@forge/react';
import { SectionHeader } from '../components';

/**
 * Funding Tab - Project allocation settings
 */
export const FundingTab = ({
    config,
    catalog,
    selectedProjectId,
    setSelectedProjectId,
    onAddProject,
    onRemoveProject,
    onAllocationChange,
    notLinkedWarning
}) => {
    const totalAllocation = (config?.funding?.projectCatalogSelection || []).reduce(
        (sum, p) => sum + (p.allocation?.value || 0), 0
    );

    return (
        <Stack space="space.150">
            <SectionHeader section="funding" />
            {notLinkedWarning}

            {/* Allocation Status */}
            <Box
                padding="space.150"
                xcss={{
                    backgroundColor: Math.abs(totalAllocation - 100) < 0.1
                        ? 'color.background.success.subtle'
                        : 'color.background.warning.subtle',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: Math.abs(totalAllocation - 100) < 0.1
                        ? 'color.border.success'
                        : 'color.border.warning'
                }}
            >
                <Inline spread="space-between" alignBlock="center">
                    <Text size="small"><Strong>Total Allocation</Strong></Text>
                    <Inline space="space.100" alignBlock="center">
                        <Badge appearance={Math.abs(totalAllocation - 100) < 0.1 ? 'primary' : 'important'}>
                            {totalAllocation.toFixed(0)}%
                        </Badge>
                        {Math.abs(totalAllocation - 100) < 0.1 ? (
                            <Lozenge appearance="success">Balanced ✓</Lozenge>
                        ) : (
                            <Lozenge appearance="moved">{totalAllocation < 100 ? 'Under-allocated' : 'Over-allocated'}</Lozenge>
                        )}
                    </Inline>
                </Inline>
                <Box xcss={{ marginTop: '8px' }}>
                    <ProgressBar
                        value={Math.min(totalAllocation / 100, 1)}
                        appearance={Math.abs(totalAllocation - 100) < 0.1 ? 'success' : 'default'}
                    />
                </Box>
            </Box>

            {/* Project List */}
            {(config?.funding?.projectCatalogSelection || []).length === 0 ? (
                <SectionMessage appearance="information">
                    <Text>No projects selected yet. Add projects below to allocate your team's impact.</Text>
                </SectionMessage>
            ) : (
                <Stack space="space.100">
                    {(config?.funding?.projectCatalogSelection || []).map(item => (
                        <Box
                            key={item.projectId}
                            padding="space.150"
                            xcss={{
                                backgroundColor: 'elevation.surface.raised',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: 'color.border.neutral'
                            }}
                        >
                            <Inline spread="space-between" alignBlock="center">
                                <Stack space="space.050">
                                    <Text><Strong>{item.name}</Strong></Text>
                                </Stack>
                                <Inline space="space.100" alignBlock="center">
                                    <Box xcss={{ width: '80px' }}>
                                        <Textfield
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={String(item.allocation?.value || 0)}
                                            onChange={(e) => onAllocationChange(item.projectId, e.target.value)}
                                        />
                                    </Box>
                                    <Text size="small">%</Text>
                                    <Button
                                        spacing="compact"
                                        appearance="subtle"
                                        onClick={() => onRemoveProject(item.projectId)}
                                    >
                                        ✕
                                    </Button>
                                </Inline>
                            </Inline>
                        </Box>
                    ))}
                </Stack>
            )}

            {/* Add Project */}
            <Box
                padding="space.150"
                xcss={{
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '8px'
                }}
            >
                <Stack space="space.100">
                    <Text size="small"><Strong>Add Project</Strong></Text>
                    <Inline space="space.100">
                        <Box xcss={{ flexGrow: '1' }}>
                            <Select
                                placeholder="Select a reforestation project..."
                                options={catalog
                                    .filter(p => !(config?.funding?.projectCatalogSelection || []).find(s => s.projectId === p.id))
                                    .map(p => ({ label: `${p.name} (${p.region || 'Global'})`, value: p.id }))
                                }
                                onChange={(opt) => setSelectedProjectId(opt.value)}
                                value={catalog.find(p => p.id === selectedProjectId) ? { label: catalog.find(p => p.id === selectedProjectId).name, value: selectedProjectId } : null}
                            />
                        </Box>
                        <Button spacing="compact" appearance="primary" onClick={onAddProject} isDisabled={!selectedProjectId}>
                            Add Project
                        </Button>
                    </Inline>
                </Stack>
            </Box>
        </Stack>
    );
};

export default FundingTab;
