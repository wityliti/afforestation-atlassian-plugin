import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import ForgeReconciler, {
    Text,
    Badge,
    Stack,
    Box,
    Heading,
    Strong,
    ProgressBar,
    Inline
} from '@forge/react';

const Panel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Get issue context from the view
                const context = await invoke('getIssueImpact', { issueId: 'current' });
                setData(context);
            } catch (err) {
                console.error('Issue panel load error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <Box
                padding="space.300"
                xcss={{
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '8px'
                }}
            >
                <Stack space="space.200" alignInline="center">
                    <ProgressBar isIndeterminate />
                    <Text>Loading impact data...</Text>
                </Stack>
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                padding="space.200"
                xcss={{
                    backgroundColor: 'color.background.danger.subtle',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'color.border.danger'
                }}
            >
                <Text>⚠️ Error: {error}</Text>
            </Box>
        );
    }

    const currencyName = data?.currencyName || 'Leaves';
    const leavesPerTree = data?.leavesPerTree || 100;
    const ledger = data?.ledger;

    const totalLeaves = ledger?.totalLeaves || 0;
    const completionCount = ledger?.completionCount || 0;
    const treesFromIssue = Math.floor(totalLeaves / leavesPerTree);

    // If no contributions yet
    if (completionCount === 0) {
        return (
            <Box
                padding="space.300"
                xcss={{
                    backgroundColor: 'color.background.neutral.subtle',
                    borderRadius: '12px',
                    border: '2px dashed',
                    borderColor: 'color.border.neutral',
                    textAlign: 'center'
                }}
            >
                <Stack space="space.200" alignInline="center">
                    <Text size="xlarge">🌱</Text>
                    <Heading as="h4">Ready to Grow?</Heading>
                    <Text>Complete this issue to earn {currencyName} and plant trees! 🌍</Text>
                </Stack>
            </Box>
        );
    }

    const progressToNextTree = (totalLeaves % leavesPerTree) / leavesPerTree;

    return (
        <Box
            padding="space.300"
            xcss={{
                backgroundColor: 'color.background.success.subtle',
                borderRadius: '12px',
                border: '2px solid',
                borderColor: 'color.border.success',
                boxShadow: 'elevation.shadow.raised'
            }}
        >
            <Stack space="space.300">
                {/* Header */}
                <Heading as="h3" size="small">🌳 Impact Tracker</Heading>

                {/* Main Stats */}
                <Stack space="space.200">
                    {/* Leaves Earned */}
                    <Box
                        padding="space.200"
                        xcss={{
                            backgroundColor: 'elevation.surface.raised',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: 'color.border.neutral'
                        }}
                    >
                        <Inline spread="space-between" alignBlock="center">
                            <Stack space="space.050">
                                <Text size="small">Total {currencyName}</Text>
                                <Heading as="h2" size="large">🍃 {totalLeaves.toLocaleString()}</Heading>
                            </Stack>
                            <Badge appearance="primary" text="Earned" />
                        </Inline>
                    </Box>

                    {/* Trees Planted */}
                    {treesFromIssue > 0 && (
                        <Box
                            padding="space.200"
                            xcss={{
                                backgroundColor: 'color.background.success',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: 'color.border.success'
                            }}
                        >
                            <Inline spread="space-between" alignBlock="center">
                                <Stack space="space.050">
                                    <Text size="small">Trees Contributed</Text>
                                    <Heading as="h2" size="large">🌲 {treesFromIssue}</Heading>
                                </Stack>
                                <Badge appearance="added" text="Planted!" />
                            </Inline>
                        </Box>
                    )}

                    {/* Progress to Next Tree */}
                    {treesFromIssue === 0 && progressToNextTree > 0 && (
                        <Box
                            padding="space.200"
                            xcss={{
                                backgroundColor: 'elevation.surface.raised',
                                borderRadius: '8px'
                            }}
                        >
                            <Stack space="space.100">
                                <Text size="small"><Strong>Progress to Next Tree</Strong></Text>
                                <ProgressBar value={progressToNextTree} appearance="success" />
                                <Text size="small">{(progressToNextTree * 100).toFixed(0)}% complete</Text>
                            </Stack>
                        </Box>
                    )}
                </Stack>

                {/* Metadata */}
                <Box
                    padding="space.200"
                    xcss={{
                        backgroundColor: 'color.background.neutral.subtle',
                        borderRadius: '8px',
                        borderTop: '1px solid',
                        borderColor: 'color.border.neutral'
                    }}
                >
                    <Stack space="space.100">
                        {completionCount > 1 && (
                            <Text size="small">🔄 Completed <Strong>{completionCount} times</Strong></Text>
                        )}
                        {ledger?.lastCompletedAt && (
                            <Text size="small">📅 Last: {new Date(ledger.lastCompletedAt).toLocaleDateString()}</Text>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};

ForgeReconciler.render(
    <React.StrictMode>
        <Panel />
    </React.StrictMode>
);
